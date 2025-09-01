from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.utils import timezone
from datetime import datetime
from django.db.models import Max
from .models import Member, Account, Loan, Payment, PaymentSchedule
import uuid
from decimal import Decimal
from decimal import Decimal, InvalidOperation
from datetime import datetime
from django.db.models import Max
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=Member)
def create_account_for_member(sender, instance, created, **kwargs):
    if created:
        current_year = datetime.now().year
        current_day = datetime.now().day
        year_suffix = str(current_year)[-2:]  
        day_suffix = str(current_day).zfill(2)  
        
        prefix = f"{year_suffix}{day_suffix}"

        last_account = Account.objects.filter(account_number__startswith=prefix).aggregate(Max('account_number'))

        last_account_number = last_account['account_number__max']
        if last_account_number:
            increment = int(last_account_number.split('-')[1]) + 1
        else:
            increment = 1

        incremental_part = str(increment).zfill(4)

        account_number = f"{prefix}-{incremental_part}"
        try:
            initial_deposit = Decimal(instance.in_dep) if instance.in_dep.isdigit() else Decimal('0.00')
        except (ValueError, InvalidOperation):
            initial_deposit = Decimal('0.00')

        Account.objects.create(
            account_number=account_number,
            account_holder=instance,
            shareCapital=initial_deposit,
            status='Active'
        )
@receiver(post_save, sender=Loan)
def handle_loan_post_save(sender, instance, created, **kwargs):
    if created and instance.status == 'Ongoing':
        if not instance.due_date:
            instance.generate_payment_schedule()

#2dago
# @receiver(post_save, sender=Payment)
# def update_payment_and_loan_status(sender, instance, created, **kwargs):
#     if created:
        
#         payment_schedule = instance.payment_schedule
#         if payment_schedule:
#             payment_schedule.balance -= instance.amount
#             payment_schedule.is_paid = payment_schedule.balance <= 0
#             payment_schedule.save()

        
#         loan = payment_schedule.loan
#         if loan.payment_schedules.filter(is_paid=False).count() == 0:
#             loan.status = 'Paid-off'
#             loan.save()

        
#         instance.description = f"Payment of {instance.amount} recorded on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}"
#         instance.transaction_type = "Payment"  
#         instance.save(update_fields=['description', 'transaction_type'])

        
#         send_mail(
#             subject='Payment Confirmation',
#             message=f'Thank you! Your payment of {instance.amount} has been received.',
#             from_email='noreply@yourdomain.com',
#             recipient_list=[loan.account.account_holder.email],
#         )

@receiver(post_save, sender=Payment)
def update_payment_and_loan_status(sender, instance, created, **kwargs):
    payment_schedule = instance.payment_schedule

    if payment_schedule:
        # Update schedule balance & status
        # payment_schedule.balance -= instance.amount
        # payment_schedule.is_paid = payment_schedule.balance <= 0
        # payment_schedule.save()

        # Recheck and update loan status
        loan = payment_schedule.loan
        loan.update_status_based_on_schedules()

    # Add description and type to Payment
    instance.description = f"Payment of {instance.amount} recorded on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}"
    instance.transaction_type = "Payment"
    instance.save(update_fields=['description', 'transaction_type'])

    # Email notification
    send_mail(
        subject='Payment Confirmation',
        message=f'Thank you! Your payment of {instance.amount} has been received.',
        from_email='noreply@yourdomain.com',
        recipient_list=[loan.account.account_holder.email],
    )

# Optional: Auto-update Loan status even when PaymentSchedule is manually updated
@receiver(post_save, sender=PaymentSchedule)
def update_loan_status_on_schedule_change(sender, instance, **kwargs):
    instance.loan.update_status_based_on_schedules()
 #2dago
    
    
from django.db.models.signals import post_delete, pre_save

@receiver(post_delete, sender=Payment)
def handle_payment_delete(sender, instance, **kwargs):
    loan = instance.loan
    loan.balance += instance.amount_paid
    loan.save()

@receiver(pre_save, sender=Payment)
def handle_payment_update(sender, instance, **kwargs):
    if instance.pk:  # Check if this is an update
        old_payment = Payment.objects.get(pk=instance.pk)
        difference = instance.amount_paid - old_payment.amount_paid
        loan = instance.loan
        loan.balance -= difference
        loan.save()
