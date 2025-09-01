from django.db import models
from decimal import Decimal, ROUND_HALF_UP,InvalidOperation
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator 
import uuid
from datetime import date
from django.utils.timezone import now
import math
from django.db.models import Sum
from django.core.exceptions import ValidationError
import logging
logger = logging.getLogger(__name__)
import json
from django.core.exceptions import ValidationError
from datetime import date, datetime
from django.contrib.auth.models import User
from django.utils.timezone import now
from datetime import timedelta
def save(self, *args, **kwargs):
    try:
        super().save(*args, **kwargs)
    except InvalidOperation as e:
        logger.error(f"Invalid decimal value: {e}")
        raise
class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        return now() < self.created_at + timedelta(hours=1)  

class Archive(models.Model):
    ARCHIVE_TYPES = [
        ('Member', 'Member'),
        ('Account', 'Account'),
        ('Loan', 'Loan'),
        ('Payment', 'Payment'),
    ]
    
    archive_type = models.CharField(
        max_length=20,
        choices=ARCHIVE_TYPES,
        default='Loan'
    )
    archived_data = models.JSONField()
    archived_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if isinstance(self.archived_data, dict):
            for key, value in self.archived_data.items():
                if isinstance(value, (date, datetime)): 
                    self.archived_data[key] = value.strftime('%Y-%m-%d')  

        
        if self.archive_type in ['Member', 'Loan', 'Account', 'Payment'] and not isinstance(self.archived_data, dict):
            raise ValidationError(f"{self.archive_type} archive must have a dictionary format.")
        
    def __str__(self):
        return f"{self.archive_type} archived on {self.archived_at}"

    def save(self, *args, **kwargs):
        if isinstance(self.archived_data, dict):
            for key, value in self.archived_data.items():
                if isinstance(value, (date, datetime)):
                    self.archived_data[key] = value.strftime('%Y-%m-%d')
        super().save(*args, **kwargs)

class SystemSettings(models.Model):

    interest_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.08'), verbose_name="Interest Rate"
    )
    service_fee_rate_emergency = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.01'), verbose_name="Emergency Loan Service Fee Rate"
    )
    penalty_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('.02'), verbose_name="Penalty Rate"
    )
    service_fee_rate_regular_1yr = models.DecimalField(
        max_digits=5, decimal_places=3, default=Decimal('0.010'),
        verbose_name="Regular Loan Service Fee Rate (<=1 year)"
    )
    service_fee_rate_regular_2yr = models.DecimalField(
        max_digits=5, decimal_places=3, default=Decimal('0.015'),
        verbose_name="Regular Loan Service Fee Rate (<=2 years)"
    )
    service_fee_rate_regular_3yr = models.DecimalField(
        max_digits=5, decimal_places=3, default=Decimal('0.020'),
        verbose_name="Regular Loan Service Fee Rate (<=3 years)",
    )
    service_fee_rate_regular_4yr = models.DecimalField(
        max_digits=5, decimal_places=3, default=Decimal('0.025'),
        verbose_name="Regular Loan Service Fee Rate (>3 years)"
    )
    admincost_r = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('240.00'))
    notarialfee_r = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('100.00'))

    def __str__(self):
        return "System Settings"

    @staticmethod
    def get_settings():
        # Ensure only one instance exists
        settings, created = SystemSettings.objects.get_or_create(pk=1)
        return settings

    def get_regular_loan_service_fee_rate(self, total_years):
        """
        Determine the service fee rate for a regular loan based on the term.
        """
        if total_years <= 1:
            return self.service_fee_rate_regular_1yr
        elif total_years <= 2:
            return self.service_fee_rate_regular_2yr
        elif total_years <= 3:
            return self.service_fee_rate_regular_3yr
        else:
            return self.service_fee_rate_regular_4yr




    def __str__(self):
        return f"System Settings (Interest Rate: {self.interest_rate}%)"


class Member(models.Model):
    memId = models.AutoField(primary_key=True)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100)
    birth_date = models.DateField()
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=12)
    gender = models.CharField(
        max_length=20, 
        choices=[('Male', 'Male'), ('Female', 'Female'), ('Others', 'Others')], 
    )
    religion = models.CharField(max_length=100, default='Catholic')
    pstatus = models.CharField(
        max_length=50, 
        choices=[
            ('Single', 'Single'), 
            ('Married', 'Married'), 
            ('Divorced', 'Divorced'), 
            ('Widowed', 'Widowed'), 
            ('In a relationship', 'In a relationship'), 
            ('Engaged', 'Engaged'), 
            ('Baak', 'Baak')
        ], 
        default='Single'
    )
    address = models.TextField(blank=True)
    account_number = models.OneToOneField(
        'Account', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='member'
    )
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='member_profile')
    birth_place = models.CharField(max_length=100, blank=True)  
    age = models.CharField(max_length=100, blank=True)  
    zip_code = models.CharField(max_length=100, blank=True, default='2616')  
    height = models.CharField(max_length=100, blank=True)
    weight = models.CharField(max_length=100, blank=True)
    ann_com = models.CharField(max_length=100, blank=True, default='0')
    mem_co = models.CharField(max_length=255, null=True, blank=True)

    beneficiary = models.CharField(max_length=255, null=True, blank=True)
    relationship = models.CharField(max_length=100)
    addresss = models.CharField(max_length=255, default="Unknown")
    birth_date1 = models.DateField(null=True, blank=True)
    beneficiary2 = models.CharField(max_length=255, null=True, blank=True)
    relationship2 = models.CharField(max_length=255, null=True, blank=True)
    birth_date2 = models.DateField(null=True, blank=True)
    beneficiary3 = models.CharField(max_length=255, null=True, blank=True)
    relationship3 = models.CharField(max_length=255, null=True, blank=True)
    birth_date3 = models.DateField(null=True, blank=True)

    tin = models.CharField(max_length=100, blank=True) 
    in_dep = models.CharField(max_length=100) 
    valid_id = models.CharField(
        max_length=50, 
        choices=[
            ('Philippine Passport', 'Philippine Passport'), 
            ('Drivers License', 'Drivers License'), 
            ('SSS ID', 'SSS ID'), 
            ('GSIS ID', 'GSIS ID'), 
            ('TIN ID', 'TIN ID'), 
            ('Postal ID', 'Postal ID'), 
            ('Voters ID', 'Voters ID'), 
            ('PhilHealth ID', 'PhilHealth ID'), 
            ('National ID', 'National ID')
        ], 
        default='TIN ID'
    )
    id_no = models.CharField(max_length=100, blank=True, default='Not Provided') 

    def delete(self, *args, **kwargs):
        try:
            logger.info(f"Archiving Member {self.memId} before deletion.")
            self.archive()  # Archive the member before deleting
            logger.info(f"Member {self.memId} archived successfully.")
        except Exception as e:
            logger.error(f"Error archiving Member {self.memId}: {e}")
        super().delete(*args, **kwargs)
    
    def archive(self):
        try:
            Archive.objects.create(
                archive_type='Member',
                archived_data={
                    "memId": self.memId,
                    "first_name": self.first_name,
                    "middle_name": self.middle_name,
                    "last_name": self.last_name,
                    "birth_date": self.birth_date,
                    "email": self.email,
                    "phone_number": self.phone_number,
                    "gender":self.gender,
                    "religion":self.religion,
                    "pstatus":self.pstatus,
                    "address": self.address,
                    "birth_place":self.birth_place,
                    "age":self.age,
                    "zip_code":self.zip_code,
                    "height":self.height,
                    "weight":self.weight,
                    "annual_income":self.ann_com,
                    "other_coop_member":self.mem_co,
                    "tin":self.tin,
                    "valid_id":self.valid_id,
                    "initial_deposit":self.in_dep,
                    "beneficiary":self.beneficiary,
                    "relationship": self.relationship,
                    "birth_date1":self.birth_date1,
                    "beneficiary2":self.beneficiary2,
                    "relationship2": self.relationship2,
                    "birth_date2":self.birth_date2,
                    "beneficiary3":self.beneficiary3,
                    "relationship3": self.relationship3,
                    "birth_date3":self.birth_date3,
                    "account_number":self.account_number,
                    "id_no":self.id_no,
                },
            )
            logger.info(f"Member {self.memId} archived successfully.")
        except Exception as e:
            logger.error(f"Error while archiving Member {self.memId}: {e}")

    def __str__(self):
        return f"{self.first_name} {self.middle_name} {self.last_name}"

    def clean(self):
        # Validate unique full name (first, middle, last name)
        if Member.objects.filter(first_name=self.first_name, middle_name=self.middle_name, last_name=self.last_name).exclude(pk=self.pk).exists():
            raise ValidationError(f'A member with the name {self.first_name} {self.middle_name} {self.last_name} already exists.')

        # Validate unique email
        if Member.objects.filter(email=self.email).exclude(pk=self.pk).exists():
            raise ValidationError(f'This email {self.email} is already in use.')

        # Validate unique phone number
        if Member.objects.filter(phone_number=self.phone_number).exclude(pk=self.pk).exists():
            raise ValidationError(f'This phone number {self.phone_number} is already in use.')

    def save(self, *args, **kwargs):
        self.clean()  # Validate before saving
        super(Member, self).save(*args, **kwargs)

class Account(models.Model):
    account_number = models.CharField(max_length=20, primary_key=True)
    account_holder = models.OneToOneField(Member, on_delete=models.CASCADE, related_name='accountN')
    shareCapital = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    status = models.CharField(max_length=10, choices=[('active', 'Active'), ('inactive', 'Inactive')], default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def archive(self):
        Archive.objects.create(
            archive_type='Account',
            archived_data={
                "account_number": self.account_number,
                "account_holder": self.account_holder,
                "shareCapital": str(self.shareCapital),
                "status": self.status,
                "created_at": self.created_at,
                "updated_at": self.updated_at,
            },
        )

    def close_account(self):
        if self.status == 'Active':
            self.archive()
            self.status = 'Inactive'
            self.save()

    def deposit(self, amount):
        max_deposit_limit = Decimal('1000000.00')  # Maximum allowed deposit

        if self.status == 'Active':
            if self.shareCapital + Decimal(amount) > max_deposit_limit:
                logger.error(f"Deposit failed: Exceeds maximum limit for account {self.account_number}.")
                raise ValueError("Deposit failed: Total share capital cannot exceed 1,000,000.00.")
            
            self.shareCapital += Decimal(amount)
            self.save()

            Ledger.objects.create(
                account_number=self,
                transaction_type='Deposit',
                amount=Decimal(amount),
                description=f"Deposit to account {self.account_number}",
                balance_after_transaction=self.shareCapital
            )
        else:
            logger.error(f"Deposit failed: Account {self.account_number} is not active.")
            raise ValueError("Account is not active. Cannot deposit.")

    def withdraw(self, amount):
        if self.status == 'Active':
            if self.shareCapital >= Decimal(amount):
                self.shareCapital -= Decimal(amount)
                self.save()

                Ledger.objects.create(
                    account_number=self,
                    transaction_type='Withdrawal',
                    amount=Decimal(amount),
                    description=f"Withdrawal from account {self.account_number}",
                    balance_after_transaction=self.shareCapital
                )
            else:
                logger.error(f"Withdrawal failed: Insufficient funds in account {self.account_number}.")
                raise ValueError("Insufficient funds.")
        else:
            logger.error(f"Withdrawal failed: Account {self.account_number} is not active.")
            raise ValueError("Account is not active. Cannot withdraw.")

    def __str__(self):
        return f"Account {self.account_number} - {self.account_holder.memId}"





#     due_date = models.DateField()
#     balance = models.DecimalField(max_digits=15, decimal_places=2)
#     is_paid = models.BooleanField(default=False)
#     loan_type = models.CharField(max_length=20, choices=[('Regular', 'Regular'), ('Emergency', 'Emergency')], default='Regular')  # Add loan_type field
    
#     def __str__(self):
#         return f"Payment for Loan {self.loan.control_number} on {self.due_date}"



class LoanManager(models.Manager):
    def create(self, **kwargs):
        # Generate unique control number before creating
        while True:
            control_number = uuid.uuid4().hex[:5].upper()
            if not self.filter(control_number=control_number).exists():
                kwargs['control_number'] = control_number
                break
        return super().create(**kwargs)

class Loan(models.Model):
    PURPOSE_CHOICES = [
        ('Education', 'Education'),
        ('Medical/Emergency', 'Medical/Emergency'),
        ('House Construction', 'House Construction'),
        ('Commodity/Appliances', 'Commodity/Appliances'),
        ('Utility Services', 'Utility Services'),
        ('Others', 'Others'),
    ]
    
    control_number = models.CharField(
        primary_key=True,
        max_length=5,
        unique=True,
        editable=False
    )
    
    account = models.ForeignKey('Account', on_delete=models.CASCADE)
    loan_amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    loan_type = models.CharField(
        max_length=200, choices=[('Regular', 'Regular'), ('Emergency', 'Emergency')], default='Emergency'
    )
    system_settings = models.ForeignKey('SystemSettings', on_delete=models.SET_NULL, null=True, blank=True)
    interest_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00')) 
    loan_period = models.PositiveIntegerField(default=6)  
    loan_period_unit = models.CharField(
        max_length=10, choices=[('months', 'Months'), ('years', 'Years')], default='months'
    )
    loan_date = models.DateField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=50,choices=[('Ongoing', 'Ongoing'), ('Paid-off', 'Paid-off')],
        default='Ongoing'
    )
   
    takehomePay = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    service_fee = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    admincost = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    notarial = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    cisp = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, default=Decimal('0.00'))
    purpose = models.CharField(max_length=200, choices=PURPOSE_CHOICES, default='Education')
    annual_interest = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))  
    outstanding_balance = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))  

    co_maker = models.CharField(max_length=255, blank=True)
    co_maker_2 = models.CharField(max_length=255, null=True, blank=True)
    co_maker_3 = models.CharField(max_length=255, null=True, blank=True)
    co_maker_4 = models.CharField(max_length=255, null=True, blank=True)
    co_maker_5 = models.CharField(max_length=255, null=True, blank=True)

    # Use the custom manager
    objects = LoanManager()

    def save(self, *args, **kwargs):
        # Fallback in case someone uses save() directly instead of create()
        if not self.control_number:
            while True:
                new_control = uuid.uuid4().hex[:5].upper()
                if not Loan.objects.filter(control_number=new_control).exists():
                    self.control_number = new_control
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Loan {self.control_number} - {self.account}"
    
    def update_outstanding_balance(self, received_amnt):

        formatted_amount = Decimal(received_amnt).quantize(Decimal('0.00'))
        if formatted_amount < self.outstanding_balance:
            self.outstanding_balance -= formatted_amount
            print(f"OUTSTANDING BALANCE after update: {self.outstanding_balance}")
            self.save(update_fields=['outstanding_balance'])
        else:
            raise ValueError("Received amount cannot be greater than the outstanding balance.")

    def archive(self):
        Archive.objects.create(
            archive_type='Loan',
            archived_data={
                "control_number": str(self.control_number),
                "account": (self.account), #2dago
                "loan_amount": str(self.loan_amount),
                "loan_type": self.loan_type,
                "loan_date": str(self.loan_date),
                "due_date": str(self.due_date),
                "status": self.status,
                "takehomePay": str(self.takehomePay),
                "purpose": self.purpose,
                "co_maker":self.co_maker,
                "co_maker_2": self.co_maker_2,
                "co_maker_3": self.co_maker_3,
                "co_maker_4": self.co_maker_4,
                "co_maker_5": self.co_maker_5,
            },
        )

    # def mark_as_paid(self):
    #     if self.status != 'Paid-off':
    #         self.archive()
    #         self.status = 'Paid-off'
    #         self.save()
    
    #2dago
    def mark_as_paid(self):
        if self.status != 'Paid-off':
            self.status = 'Paid-off'
            self.archive()
            self.save()

    def update_status_based_on_schedules(self):
        if self.paymentschedule_set.filter(is_paid=False).exists():
            self.status = 'Ongoing'
            self.archive = False
        else:
            #self.mark_as_paid()
            self.status = 'Paid-off'
            self.archived = True
        self.save()
    #2dago
    
    def save(self, *args, **kwargs):
        print(f"Saving loan: {self.control_number}")
        if not self.system_settings:
            self.system_settings = SystemSettings.get_settings()
            print(f"Loaded system settings: {self.system_settings}")

               # Validate loan period
        self.validate_loan_period()

        # Calculate initial values on loan creation
        if not self.pk:
            self.calculate_initial_values()
        if not self.loan_date:
            self.loan_date = timezone.now().date()
        if not self.annual_interest:
            self.annual_interest = self.system_settings.interest_rate

        
        if self.loan_period_unit == 'months' and self.loan_period > 48:
            raise ValueError("Loan period cannot exceed 48 months for regular loans.")
        if self.loan_period_unit == 'years' and self.loan_period > 4:
            raise ValueError("Loan period cannot exceed 4 years for regular loans.")
        if self.loan_period_unit not in ['years', 'months']:
            raise ValueError("Invalid loan_period_unit. Must be 'years' or 'months'.")
        if not hasattr(self.system_settings, 'service_fee_rate_regular_1yr'):
            raise ValueError("Missing 1-year service fee rate in system settings.")

        if not hasattr(self, 'system_settings') or not self.system_settings:
            try:
                self.system_settings = SystemSettings.objects.first()
            except SystemSettings.DoesNotExist:
                raise ValueError("System settings are not configured for this loan.")
        
        self.calculate_initial_values()
        # self.calculate_service_fee()
        # self.calculate_takehome_pay()
        # self.calculate_interest()
        
        print("Service Fee:", self.service_fee)  # Debugging line
        print("Takehome Pay:", self.takehomePay)  # Debugging line
        
        self.admincost = Decimal(self.system_settings.admincost_r) 
        self.notarial = Decimal(self.system_settings.notarialfee_r)
        self.cisp = (self.loan_amount / Decimal('1000')) * Decimal('0.75') * Decimal('12')
        self.takehomePay= self.loan_amount - (
                self.service_fee + self.system_settings.admincost_r + self.system_settings.notarialfee_r + self.cisp + self.interest_amount)
        
        # For Year 1: Calculate outstanding balance (takehomePay formula)
        if not self.outstanding_balance:
            self.outstanding_balance = self.takehomePay
            
        else:
            # For Year 2 and onward: Use formula excluding notarial fee
            self.outstanding_balance = self.loan_amount - (
                self.service_fee + self.admincost + self.cisp + self.interest_amount + 100
            )
        if not self.loan_date:
            self.loan_date = timezone.now().date()
        print(f"Loan date set to {self.loan_date}")     
        # Calculate due date
        if not self.due_date:
            self.due_date = self.calculate_due_date()
            print(f"Calculated due date: {self.due_date}")

        self.yearly_recalculation()
        super().save(*args, **kwargs)
        print(f"Loan {self.control_number} saved successfully.")

        # Generate payment schedule if loan is ongoing
        if self.status == 'Ongoing':
            self.generate_payment_schedule()

    def validate_loan_period(self):
        """Ensure the loan period adheres to type-specific constraints."""
        if self.loan_type == 'Regular' and self.loan_period > 48:
            raise ValueError("Regular loans cannot exceed 4 years (48 months).")
        if self.loan_type == 'Emergency' and self.loan_period > 6:
            raise ValueError("Emergency loans cannot exceed 6 months.")

    def calculate_initial_values(self):
        """Calculate the initial loan-related values upon loan creation."""
        self.calculate_service_fee()
        self.interest_amount = self.loan_amount * (self.annual_interest / Decimal('100'))
        self.admincost = Decimal(self.system_settings.admincost_r) 
        self.notarial = Decimal(self.system_settings.notarialfee_r)
        self.cisp = (self.loan_amount / Decimal('1000')) * Decimal('0.75') * 12
        self.takehomePay = self.loan_amount - (
            self.service_fee + self.admincost + self.notarial + self.cisp + self.interest_amount
        )
        self.outstanding_balance = (self.takehomePay)

        print(
            f"Initial values calculated: service_fee={self.service_fee}, interest_amount={self.interest_amount}, "
            f"admincost={self.admincost}, notarial={self.notarial}, cisp={self.cisp}, "
            f"takehomePay={self.takehomePay}, outstanding_balance={self.outstanding_balance}"
        )
    def calculate_interest(self):
        """Calculate the interest amount based on the loan amount and annual interest rate."""
        self.interest_amount = (self.loan_amount * (self.annual_interest / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

     
    def yearly_recalculation(self):
        """Recalculate values at the start of each new year."""
        years_elapsed = (timezone.now().date() - self.loan_date).days // 365
        if years_elapsed >= 1:
            # Determine the service fee rate for the current year
            rate_map = {
                1: self.system_settings.service_fee_rate_regular_1yr,
                2: self.system_settings.service_fee_rate_regular_2yr,
                3: self.system_settings.service_fee_rate_regular_3yr,
                4: self.system_settings.service_fee_rate_regular_4yr,
            }
            rate = rate_map.get(years_elapsed, self.system_settings.service_fee_rate_regular_4yr)
            self.service_fee = self.loan_amount * rate

            # Update admin cost and CISP
            self.admincost += Decimal(self.system_settings.admincost_r) * 12
            self.cisp = (self.outstanding_balance / Decimal('1000')) * Decimal('0.75') * Decimal('12')

            # Exclude notarial fee and take-home pay from recalculations
            self.outstanding_balance = self.loan_amount - (
                self.service_fee + self.admincost + self.cisp + self.interest_amount
            )
            # Update remaining payment schedules
            unpaid_schedules = self.paymentschedule_set.filter(is_paid=False)
            if unpaid_schedules.exists():
                new_principal = (self.outstanding_balance / unpaid_schedules.count()).quantize(Decimal('0.01'))
                for schedule in unpaid_schedules:
                    schedule.principal_amount = new_principal
                    schedule.payment_amount = new_principal
                    schedule.save()


    
    def calculate_service_fee(self):
        """Calculate the service fee based on the loan type and system settings."""
        if self.loan_type == 'Emergency':
            self.service_fee = self.loan_amount * self.system_settings.service_fee_rate_emergency
        else:
            if self.loan_period <= 12:
                self.service_fee = self.loan_amount * self.system_settings.service_fee_rate_regular_1yr
            elif self.loan_period <= 24:
                self.service_fee = self.loan_amount * self.system_settings.service_fee_rate_regular_2yr
            elif self.loan_period <= 36:
                self.service_fee = self.loan_amount * self.system_settings.service_fee_rate_regular_3yr
            else:
                self.service_fee = self.loan_amount * self.system_settings.service_fee_rate_regular_4yr

        print(f"Service fee calculated: {self.service_fee}")


    def calculate_takehomePay(self):
        self.takehomePay = self.loan_amount - (
            self.service_fee + self.notarial + self.cisp + self.admincost +self.interest_amount
        )
        return self.takehomePay
        
    def calculate_due_date(self):
        """Calculate the loan due date based on the loan period."""
        if not self.loan_date:
            raise ValueError("Loan date is not set. Cannot calculate due date.")

        if self.loan_period_unit == 'months':
            return self.loan_date + timezone.timedelta(days=self.loan_period * 30)
        elif self.loan_period_unit == 'years':
            return self.loan_date + timezone.timedelta(days=self.loan_period * 365)
        return None


    def check_loan_eligibility_for_reloan(self):
        """Check if at least 50% of the loan is paid off."""
        total_paid = Payment.objects.filter(
            payment_schedule__loan=self
        ).aggregate(
            total_paid=Sum('payment_amount')
        )['total_paid'] or 0
        return total_paid >= (self.loan_amount / 2)


    def generate_payment_schedule(self):
        if PaymentSchedule.objects.filter(loan=self).exists():
            return
        
        total_months = self.loan_period * (12 if self.loan_period_unit == 'years' else 1)
        total_periods = total_months * 2  # Bi-monthly (payments every 15 days)
        

        loan_principal = self.outstanding_balance

        
        loan_balance = loan_principal  # Start with the full loan amount

        for period in range(total_periods):
            due_date = self.loan_date + timedelta(days=(period +1) * 15)
            


             # Create the payment schedule for this period
            PaymentSchedule.objects.create(
                loan=self,
                principal_amount=(loan_principal / total_periods).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                original_principal=(loan_principal / total_periods).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                # interest_amount=(total_interest / total_periods).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                due_date=due_date,
                balance=loan_balance.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                loan_type=self.loan_type  # Keep loan type consistent across schedules
            )
    def __str__(self):
        return f"Loan {self.control_number} for {self.account} ({self.status})"
      
class PaymentSchedule(models.Model):
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE)
    principal_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    advance_pay = models.DecimalField(max_digits=15, decimal_places=2,  default=Decimal('0.00'))
    under_pay = models.DecimalField(max_digits=15, decimal_places=2,  default=Decimal('0.00'))
    received_amnt = models.DecimalField(max_digits=15, decimal_places=2,  default=Decimal('0.00'))
    payment_amount = models.DecimalField(max_digits=15, decimal_places=2,  default=Decimal('0.00'))
    penalty = models.DecimalField(max_digits=15, decimal_places=2,default=Decimal('0.00'))
    due_date = models.DateField()
    balance = models.DecimalField(max_digits=15, decimal_places=2,default=Decimal('0.00'))
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_paid = models.BooleanField(default=False)
    loan_type = models.CharField(max_length=20, choices=[('Regular', 'Regular'), ('Emergency', 'Emergency')], default='Regular')  
    original_principal = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True) #allen
    
    
    def archive(self):
        Archive.objects.create(
            archive_type='PaymentSchedule',
            archived_data={
                "control_number": str(self.control_number),
                "account": (self.account), #2dago
                "loan":str(self.loan),
                "principal_amount":(self.principal_amount),
                "penalty":str(self.penalty),
                "due_date":str(self.due_date),
                
            },
        )
   
    def mark_as_paid(self):
        if self.balance <= Decimal('0.00'):
            self.is_paid = True
            self.save() 
    def process_payment(self, received_amnt):
        received_amnt = Decimal(received_amnt)
        if received_amnt <= 0:
            raise ValueError("Received amount must be greater than zero.")
        
        # Proceed with logic
        if received_amnt > self.payment_amount:
            overpayment = received_amnt - self.payment_amount
            self.advance_pay += overpayment
            self.under_pay = Decimal('0.00')
        elif received_amnt < self.payment_amount:
            underpayment = self.payment_amount - received_amnt
            self.under_pay += underpayment
            self.advance_pay = Decimal('0.00')
            self.penalty += (underpayment * Decimal('0.02')).quantize(Decimal('0.01'))
        else:
            self.advance_pay = Decimal('0.00')
            self.under_pay = Decimal('0.00')

        self.balance -= received_amnt  # Correct deduction from balance
        self.remaining_balance = self.balance
        if self.balance <= Decimal('0.00'):
            self.is_paid = True

        self.save()


    class Meta:
        ordering = ['due_date']


    def apply_advance_pay(self):
        """Apply any advance payments to the remaining balance."""
        if self.advance_pay > Decimal('0.00'):
            self.balance = max(Decimal('0.00'), self.balance - self.advance_pay)
            self.advance_pay = Decimal('0.00')  # Reset advance after applying
            self.save()
            
    def calculate_payment_amount(self):
        base_payment = self.principal_amount
        total_payment = base_payment + self.under_pay
        
        self.payment_amount = total_payment
        print(f"Calculated Payment Amount: {self.payment_amount}")

    def save(self, *args, **kwargs):
        print(f"Saving Payment Schedule for Loan {self.loan.control_number}")
        self.calculate_payment_amount()
        super().save(*args, **kwargs)
    def __str__(self):
        return f"Payment for Loan {self.loan.control_number} on {self.due_date}"
  



class Payment(models.Model):
    OR = models.CharField(max_length=5, primary_key=True, unique=True)
    payment_schedule = models.ForeignKey(PaymentSchedule, on_delete=models.CASCADE, related_name='payments')
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name='loans',default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default = Decimal("0.00"))
    date = models.DateField(default=now)
    method = models.CharField(max_length=50, choices=[('Cash', 'Cash'), ('Bank Transfer', 'Bank Transfer')])

    def archive(self):
        member_id = None
        if self.loan and self.loan.account and self.loan.account.account_holder:
            member_id = self.loan.account.account_holder.memId
        Archive.objects.create(
            archive_type='Payment',
            archived_data={
                "OR": str(self.OR),
                "loan": str(self.loan),
                "amount": float(self.amount),
                "date": str(self.date),
                "member_id": member_id, 
            },
        )

    def save(self, *args, **kwargs):
        if self.amount > self.payment_schedule.balance:
            raise ValidationError("Payment amount exceeds the remaining balance.")
        
        super().save(*args, **kwargs)
        
        self.payment_schedule.balance -= self.amount
        self.payment_schedule.mark_as_paid()


class Ledger(models.Model):
    ledger_id = models.AutoField(primary_key=True)  
    account_number = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='ledger_entries')
    transaction_type = models.CharField(max_length=20, choices=[('Deposit', 'Deposit'), ('Withdrawal', 'Withdrawal')])
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    description = models.TextField()
    balance_after_transaction = models.DecimalField(max_digits=15, decimal_places=2)
    timestamp = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.transaction_type} of {self.amount} on {self.timestamp}"

# class AuditLog(models.Model):
#     ACTION_TYPES = [
#         ('CREATE', 'Create'),
#         ('UPDATE', 'Update'),
#         ('DELETE', 'Delete'),
#         ('LOGIN', 'Login'),
#         ('LOGOUT', 'Logout'),
#     ]
    
#     action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
#     description = models.TextField()
#     user = models.CharField(max_length=100)  
#     timestamp = models.DateTimeField(auto_now_add=True)

#     def __str__(self):
#         return f"{self.action_type} by {self.user} at {self.timestamp}"



# audit
class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATED', 'Created'),
        ('UPDATED', 'Updated'),
        ('DELETED', 'Deleted'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.timestamp} - {self.user} - {self.action_type}"


class ArchivedAccount(models.Model):
    archive_type = models.CharField(max_length=50)
    archived_data = models.JSONField()  
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Archived Account {self.id}"
    