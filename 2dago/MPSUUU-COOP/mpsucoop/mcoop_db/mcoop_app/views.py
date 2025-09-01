from rest_framework import generics, status, viewsets, filters
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal
from django.contrib.auth import authenticate
import jwt
from django.http import JsonResponse
import uuid
from django.db.models import Sum, Min, F, OuterRef, Subquery, Count
from rest_framework.decorators import api_view
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from django.db import transaction
from .models import Member, Account, Loan, PaymentSchedule, Payment, Ledger
from .serializers import (
    MemberSerializer, AccountSerializer, LoanSerializer, UpdatePasswordSerializer,
    PaymentScheduleSerializer, PaymentSerializer,LedgerSerializer, MemberTokenSerializer,RegisterMemberSerializer
)
from uuid import UUID
from rest_framework.decorators import api_view, permission_classes
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from .serializers import UserSerializer
from rest_framework import serializers
from rest_framework.views import APIView
from .models import SystemSettings
from .serializers import SystemSettingsSerializer
from rest_framework.authentication import TokenAuthentication
import logging

logger = logging.getLogger(__name__)
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Archive
from .serializers import ArchiveSerializer
from .models import AuditLog  
from .serializers import AuditLogSerializer
from django.views import View
from .models import Account, ArchivedAccount
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_decode
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
import json
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from django.db.models import Q
from .models import Archive
from .models import Archive, Member, Account, Loan, PaymentSchedule, Payment, Ledger
import math


class ArchiveViewSet(viewsets.ModelViewSet):
    authentication_classes = [TokenAuthentication]
    permission_classes = [AllowAny]
    serializer_class = ArchiveSerializer

    def get_queryset(self):
        # Filter the queryset based on the type of archive (users or loans)
        archive_type = self.request.query_params.get('archive_type', None)
        if archive_type:
            return Archive.objects.filter(archive_type=archive_type)
        return Archive.objects.all()

class SystemSettingsView(APIView):
    def get(self, request):
        settings = SystemSettings.get_settings()
        serializer = SystemSettingsSerializer(settings)
        return Response(serializer.data, status=200)

    def put(self, request):
        settings = SystemSettings.get_settings()
        serializer = SystemSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)

    def post(self, request):
        serializer = SystemSettingsSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    
class UpdateMemberViews(generics.UpdateAPIView):
    serializer_class = UpdatePasswordSerializer
    # permission_classes = [IsAuthenticated]

    def put(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        print("account account_number:: ",request.data.get("account_number"))
        account_number = serializer.validated_data['account_number']
        email = serializer.validated_data['email']

        username = serializer.validated_data['username']
        new_password = serializer.validated_data['new_password']

        try:
            # account = Account.objects.get(account_number=account_number)
            user = User.objects.get(email=email)
            user.set_password(new_password)
            user.username = username
            user.save()

            return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)

        except Account.DoesNotExist:
            return Response({"error": "Invalid account number."}, status=status.HTTP_400_BAD_REQUEST)

        except AttributeError:
            return Response({"error": "User account not linked properly."}, status=status.HTTP_400_BAD_REQUEST)
            
class RegisterMemberView(generics.CreateAPIView):
    serializer_class = RegisterMemberSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        account_number = serializer.validated_data['account_number']
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        try:
            account = Account.objects.get(account_number=account_number)
            member = account.account_holder

            if member.email != email:
                return Response({"error": "Email does not match records."}, status=status.HTTP_400_BAD_REQUEST)

            # ✅ Keep proper name format
            full_name = f"{member.first_name} {member.middle_name} {member.last_name}".strip()

            if User.objects.filter(username=full_name).exists():
                return Response({"error": "This member is already registered."}, status=status.HTTP_400_BAD_REQUEST)

            user = User.objects.create_user(username=full_name, email=email, password=password)
            member.user = user
            member.save()

            return Response({
                "id": user.id,
                "username": user.username,  # e.g. "Juan P Cruz"
                "email": user.email,
                "account_number": account_number
            }, status=status.HTTP_201_CREATED)

        except Account.DoesNotExist:
            return Response({"error": "Invalid account number."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def member_login(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'detail': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    member_user = authenticate(username=username, password=password)
    if member_user is not None and hasattr(member_user, 'member_profile'):
        from rest_framework_simplejwt.tokens import RefreshToken
        tokens = RefreshToken.for_user(member_user)

        member_profile = member_user.member_profile
        account_number = getattr(member_profile.accountN, 'account_number', None)

        if not account_number:
            return Response({'detail': 'Account information is missing or invalid'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'access': str(tokens.access_token),
            'refresh': str(tokens),
            'account_number': account_number,
            'user_id': member_user.id,
            'email': member_user.email,
            'username': member_user.username,  # e.g. "Juan P Cruz"
        }, status=status.HTTP_200_OK)
    else:
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)










User = get_user_model()

def forgot_password(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email", "").strip().lower()

            if not email:
                return JsonResponse({"error": "Email is required"}, status=400)

           
            archived_emails = Archive.objects.filter(
                archive_type='Member'
            ).values_list('archived_data__email', flat=True)

            
            member = Member.objects.filter(email__iexact=email).exclude(email__in=archived_emails).first()

            if member and member.user:
                user = member.user  
                token_generator = PasswordResetTokenGenerator()
                token = token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                reset_link = f"http://localhost:3000/reset-password/{uid}/{token}"

                send_mail(
                    "Password Reset Request",
                    f"Hi {member.first_name} {member.middle_name} {member.last_name}\nHave you Requested resetting your Password?\nIf so, Kindly Reset your password here:\n{reset_link}",
                    "MPSPC COOP",
                    [email],
                    fail_silently=False,
                )

                return JsonResponse({
                    "message": "Password reset email sent.",
                    "uid": uid,
                    "token": token
                })
            else:
                return JsonResponse({"error": "No active user with this email exists"}, status=404)

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format"}, status=400)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)


def reset_password(request, uidb64, token):
    if request.method == "POST":
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            return JsonResponse({"error": "Invalid user"}, status=400)

        token_generator = PasswordResetTokenGenerator()
        if not token_generator.check_token(user, token):
            return JsonResponse({"error": "Invalid or expired token"}, status=400)

        
        data = json.loads(request.body)
        new_password = data.get("password")

        if not new_password:
            return JsonResponse({"error": "Password cannot be empty"}, status=400)

        try:
            validate_password(new_password, user)  
        except ValidationError as e:
            return JsonResponse({"error": e.messages}, status=400)

        user.set_password(new_password)
        user.save()
        return JsonResponse({"message": "Password reset successful"})

    return JsonResponse({"error": "Invalid request method"}, status=405)

    
class MemberLoginView(TokenObtainPairView):
    serializer_class = MemberTokenSerializer
class AdminLoginView(TokenObtainPairView):
    pass  


class LogoutView(APIView):
    def post(self, request):
        try:
            token = request.data.get("refresh")
            token_obj = RefreshToken(token)
            token_obj.blacklist()
            return Response({"message": "Logged out successfully."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MemberProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            member = Member.objects.get(user=request.user)
            serializer = MemberSerializer(member)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Member.DoesNotExist:
            return Response({"error": "Member not found"}, status=status.HTTP_404_NOT_FOUND)
    def put(self, request):
        try:
            member = Member.objects.get(user=request.user)
            # Pass partial=True to allow only modified fields to be updated
            serializer = MemberSerializer(member, data=request.data, partial=True)
            if serializer.is_valid():
                # Ensure unique validation only for the email field
                if 'email' in request.data:
                    email = request.data.get('email')
                    if email and Member.objects.filter(email=email).exclude(memId=member.memId).exists():
                        return Response({"error": "This email is already in use by another member."}, status=status.HTTP_400_BAD_REQUEST)
                
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Member.DoesNotExist:
            return Response({"error": "Member not found"}, status=status.HTTP_404_NOT_FOUND)
        
class MemberFilter(django_filters.FilterSet):
    account_number = django_filters.CharFilter(field_name='accountN__account_number', lookup_expr='exact')

    class Meta:
        model = Member
        fields = ['account_number']  

class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = MemberFilter  
    search_fields = ['accountN__account_number']  
class UserDeleteView(APIView):
    permission_classes = [IsAuthenticated]  
    
    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)  
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class MemberListCreateView(generics.ListCreateAPIView):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer

class MemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [AllowAny]

    def _handle_transaction(self, account, amount, transaction_type):
        try:
            amount = Decimal(amount)
            if amount <= 0:
                return Response({"error": "Amount must be a positive value."}, status=status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError):
            return Response({"error": "Invalid amount format."}, status=status.HTTP_400_BAD_REQUEST)

        max_deposit_limit = Decimal('1000000.00')  # Maximum allowed balance
        print(f"Account current balance: {account.shareCapital}, Deposit amount: {amount}")

        try:
            if transaction_type == 'deposit':
                if account.shareCapital + amount > max_deposit_limit:
                    return Response({
                        "error": f"Deposit failed: Total balance cannot exceed {max_deposit_limit:.2f}. Current balance is {account.shareCapital:.2f}."
                    }, status=status.HTTP_400_BAD_REQUEST)

                account.deposit(amount)
                message = "Deposit successful!"

            elif transaction_type == 'withdraw':
                account.withdraw(amount)
                message = "Withdrawal successful!"

            else:
                return Response({"error": "Invalid transaction type."}, status=status.HTTP_400_BAD_REQUEST)

            return Response({"message": message, "new_balance": account.shareCapital}, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)




    @action(detail=True, methods=['post'], url_path='deposit')
    def deposit(self, request, pk=None):
        account = self.get_object()
        amount = request.data.get('amount')
        return self._handle_transaction(account, amount, 'deposit')

    @action(detail=True, methods=['post'], url_path='withdraw')
    def withdraw(self, request, pk=None):
        account = self.get_object()
        amount = request.data.get('amount')
        return self._handle_transaction(account, amount, 'withdraw')


def get_account_sharecapital(request, account_number):
    try:
        # Fetch the account using the account_number
        account = Account.objects.get(account_number=account_number)
        
        # Return the share capital of the account
        return JsonResponse({'shareCapital': account.shareCapital})  # Adjust field name as needed
    except Account.DoesNotExist:
        return JsonResponse({'error': 'Account not found'}, status=404)


class LoanViewSet(viewsets.ModelViewSet):
    queryset = Loan.objects.all()
    serializer_class = LoanSerializer
    permission_classes = [AllowAny]
    
    def get(self, request):
        loans = Loan.objects.all()  # Fetch all loans from the database
        serializer = LoanSerializer(loans, many=True)  # Serialize the data
        loan_data = serializer.data  # Get the serialized data
        print("Serialized Loan Data:", loan_data)  # Print to the terminal
        return Response(loan_data) 
#2dago
    # @action(detail=True, methods=['post'])
    # def mark_as_paid(self, request, pk=None):
    #     loan = self.get_object()
    #     loan.mark_as_paid()
    #     return Response({'status': 'loan marked as paid'})
    
    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        loan = self.get_object()
        loan.update_status_based_on_schedules()
        return Response({'status': loan.status})

#2dago
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        loan = self.get_object()
        loan.archive()
        return Response({'status': 'loan archived'})

    def get_queryset(self):
        control_number = self.request.query_params.get('control_number', None)
        if control_number:
            try:
                uuid.UUID(control_number)
            except ValueError:
                return Loan.objects.none()
            return Loan.objects.filter(control_number=control_number)
        return super().get_queryset()

    @action(detail=False, methods=['post'])
    
    def create_loan(self, request):
        account_number = request.data.get('account_number')
        try:
            account = Account.objects.get(account_number=account_number)
        except Account.DoesNotExist:
            return Response({"error": "Account not found."}, status=status.HTTP_404_NOT_FOUND)

        active_loan = Loan.objects.filter(account=account).first()
        if active_loan and not active_loan.check_loan_eligibility_for_reloan():
            return Response({
                "error": "50% of the existing loan must be paid off before applying for a new loan."
            }, status=status.HTTP_400_BAD_REQUEST)

        loan_data = request.data.copy()
        
        # Remove control_number from loan_data if it exists (let the model handle it)
        loan_data.pop('control_number', None)

        try:
            with transaction.atomic():
                # The model's save() method will automatically generate a unique control_number
                new_loan = Loan.objects.create(**loan_data)
                new_loan.takehomePay = (new_loan.loan_amount - (new_loan.service_fee + new_loan.interest_amount + new_loan.admincost + new_loan.notarial + new_loan.cisp))
                new_loan.save()

                self.create_payment_schedule(new_loan)

                return Response({
                    "status": "Loan created successfully",
                    "control_number": new_loan.control_number,
                    "loan_data": {
                        "control_number": new_loan.control_number,
                        "account": str(new_loan.account),  # Convert to string if needed
                        "loan_amount": str(new_loan.loan_amount),
                        "loan_type": new_loan.loan_type,
                        "takehomePay": str(new_loan.takehomePay),
                        "service_fee": str(new_loan.service_fee),
                        "interest_amount": str(new_loan.interest_amount),
                        "admincost": str(new_loan.admincost),
                        "notarial": str(new_loan.notarial),
                        "cisp": str(new_loan.cisp),
                        "loan_date": str(new_loan.loan_date),
                        "due_date": str(new_loan.due_date),
                        "purpose": new_loan.purpose,
                        "status": new_loan.status,
                    }
                }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Error creating loan: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    def create_payment_schedule(self, loan):
        loan_amount = loan.loan_amount
        loan_period = loan.loan_period

        installment_amount = loan_amount / loan_period

        for month in range(loan_period):
            PaymentSchedule.objects.create(
                loan=loan,
                due_date=timezone.now() + timezone.timedelta(days=(month * 30)),
                balance=installment_amount,
                installment_amount=installment_amount,
                status='Ongoing',
                principal_amount=installment_amount,
                payment_amount=installment_amount,
                original_principal=installment_amount
            )

    @action(detail=True, methods=['get'])
    def payment_schedule(self, request, pk=None):
        loan = self.get_object()
        payment_schedule = PaymentSchedule.objects.filter(loan=loan)
        return Response(PaymentScheduleSerializer(payment_schedule, many=True).data)


    @action(detail=False, methods=['get'])
    def by_account(self, request):
        account_number = request.query_params.get('account_number', None)
        
        if not account_number:
            return Response({"detail": "Account number not provided."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            loans = Loan.objects.filter(account__account_number=account_number)
            serializer = LoanSerializer(loans, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": "An error occurred while fetching loans."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
class PaymentScheduleViewSet(viewsets.ModelViewSet):
    queryset = PaymentSchedule.objects.all()
    serializer_class = PaymentScheduleSerializer


    @action(detail=False, methods=['get'], url_path='summaries')
    def payment_schedule_summaries(self, request):
        loan_type = request.query_params.get('loan_type', None)
        earliest_due_date = PaymentSchedule.objects.filter(
            loan__account=OuterRef('loan__account'),
            is_paid=False
        ).values('due_date').order_by('due_date')[:1]
        
        summaries = PaymentSchedule.objects.filter(
            is_paid=False,
            due_date=Subquery(earliest_due_date)
        )

        if loan_type:  
            summaries = summaries.filter(loan__loan_type=loan_type)

        summaries = summaries.annotate(
            account_number=F('loan__account__account_number'),
            next_due_date=F('due_date'),
            total_balance=Sum('balance'),
            loan_type_annotated=F('loan__loan_type')  
        ).values('account_number', 'next_due_date', 'total_balance', 'loan_type_annotated').distinct()

        return Response(summaries)

    @action(detail=True, methods=['get'])
    def loan_details(self, request, pk=None):
        schedule = self.get_object()
        loan = schedule.loan
        return Response(LoanSerializer(loan).data)


    def get_queryset(self):
        account_number = self.request.query_params.get('account_number')
        loan_type = self.request.query_params.get('loan_type', None)

        queryset = self.queryset

        if account_number:
            queryset = queryset.filter(loan__account__account_number=account_number)

        if loan_type:
            queryset = queryset.filter(loan__loan_type=loan_type)

        return queryset

#2dago
    # def mark_as_paid(self, request, pk=None):
    #     schedule = self.get_object()
    #     received_amnt = request.data.get('received_amnt', schedule.balance)  
    #     schedule.process_payment(received_amnt)
    #     return Response({'status': 'Payment processed and marked as paid.'}, status=status.HTTP_200_OK)
    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        schedule = self.get_object()
        received_amnt = request.data.get('received_amnt', schedule.balance)
        schedule.process_payment(received_amnt)

        # Ensure loan status is synced
        schedule.loan.update_status_based_on_schedules()

        return Response({'status': 'Payment processed and loan status updated.'})
#2dago


def process_payment_view(request, pk):
    if request.method == "POST":
        # Parse JSON body
        try:
            body = json.loads(request.body)
            received_amnt = body.get('received_amnt')
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON payload"}, status=400)
        
        if not received_amnt:
            return JsonResponse({"error": "received_amnt is required"}, status=400)
        
        # Process the payment
        try:
            payment_schedule = get_object_or_404(PaymentSchedule, pk=pk)
            payment_schedule.process_payment(received_amnt)
            return JsonResponse({
                "message": "Payment processed successfully",
                "advance_pay": str(payment_schedule.advance_pay),
                "under_pay": str(payment_schedule.under_pay),
                "penalty": str(payment_schedule.penalty),
                "balance": str(payment_schedule.balance),
                "is_paid": payment_schedule.is_paid
            })
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    return JsonResponse({"error": "Invalid request method"}, status=405)


def mark_as_paid(request, id):
    try:
        schedule = PaymentSchedule.objects.get(id=id)
        data = json.loads(request.body)
        received_amount = data.get('received_amount', schedule.balance)
        account_number = data.get('account_number', schedule.balance)
        schedule.process_payment(schedule.balance)
        return JsonResponse({'status': 'Payment processed and marked as paid.'}, status=status.HTTP_200_OK)
    except PaymentSchedule.DoesNotExist:
        return JsonResponse({'error': 'Payment schedule not found.'}, status=status.HTTP_404_NOT_FOUND)


def update_loan_status(loan):
    unpaid_count = loan.paymentschedule_set.filter(is_paid=False).count()

    if unpaid_count == 0:
        loan.status = 'Paid-off'
        loan.archived = True
    else:
        loan.status = 'Ongoing'

    loan.save()


    
class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
       

       
        schedule = PaymentSchedule.objects.get(id=request.data['schedule_id'])
        if schedule:
            schedule.is_paid = True
            schedule.status = 'Paid'
            schedule.save()
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
def update(self, request, *args, **kwargs):
    partial = kwargs.pop('partial', False)
    instance = self.get_object()

    # Get OR value
    or_value = request.data.get('OR')
    if or_value:
        instance.OR = or_value
        instance.save()

    serializer = self.get_serializer(instance, data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    self.perform_update(serializer)

    return Response(serializer.data)



@api_view(['GET'])
def get_payments(request, control_number):
    try:
        control_number_uuid = UUID(control_number)  

        # Log the control_number_uuid to check if it's correct
        logger.info(f"Fetching payments for Loan with Control Number: {control_number_uuid}")

        loan = Loan.objects.get(control_number=control_number_uuid)

        # Ensure the loan is associated with the logged-in member's account
        if loan.account.account_holder.user != request.user:
            return Response({"error": "You do not have permission to view payments for this loan."}, status=status.HTTP_403_FORBIDDEN)

        payments = Payment.objects.filter(payment_schedule__loan=loan)
        if payments.exists():
            serializer = PaymentSerializer(payments, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response({"error": "No payments found for this loan."}, status=status.HTTP_404_NOT_FOUND)
    
    except Loan.DoesNotExist:
        return Response({"error": "Loan not found."}, status=status.HTTP_404_NOT_FOUND)
    
    except ValueError:
        return Response({"error": "Invalid UUID format."}, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        logger.error(f"Error fetching payments: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




class ActiveLoansByAccountView(APIView):
    def get(self, request, account_number):
        loans = Loan.objects.filter(account__account_number=account_number)
        print(f"Loans found: {loans}")

        active_loans_data = []
        payment_schedules_data = []

        for loan in loans:
            schedules = PaymentSchedule.objects.filter(loan=loan)
            active = False
            schedule_data = []
            for schedule in schedules:
                if not schedule.is_paid:
                    active = True
                    schedule_data.append(PaymentScheduleSerializer(schedule).data)

            if active:
                active_loans_data.append(LoanSerializer(loan).data)
                payment_schedules_data.append(schedule_data)

        if active_loans_data:
            return Response({
                'active_loans': active_loans_data,
                'payment_schedules': payment_schedules_data
            })
        else:
            return Response({"message": "No active loans found."}, status=status.HTTP_404_NOT_FOUND)

# @api_view(['POST'])
# def update_breakdown(request):
#     schedules_id = request.data.get('schedules_id', [])
#     new_amount = request.data.get('new_amount', None)

#     if not schedules_id or new_amount is None:
#         return Response({"error": "Missing schedules_id or new_amount"}, status=400)

#     try:
#         new_amount = Decimal(new_amount)
#     except ValueError:
#         return Response({"error": "Invalid amount format"}, status=400)

#     # Get all unpaid schedules
#     payment_schedules = PaymentSchedule.objects.filter(id__in=schedules_id, is_paid=False).order_by("due_date")
    
#     if not payment_schedules.exists():
#         return Response({"error": "No matching schedules found"}, status=404)

#     # Get total remaining balance
#     total_remaining_balance = sum(schedule.remaining_balance for schedule in payment_schedules)

#     # Get first schedule to check original values
#     first_schedule = payment_schedules.first()
#     original_principal = first_schedule.principal_amount
#     original_payment = first_schedule.payment_amount

#     # ✅ Ensure new amount is not lower than original
#     if new_amount < original_principal or new_amount < original_payment:
#         return Response({"error": "New amount must not be less than the original amount"}, status=400)

#     # ✅ If new amount >= total balance, mark as fully paid
#     if new_amount >= total_remaining_balance:
#         payment_schedules.update(is_paid=True, remaining_balance=0, payment_amount=new_amount)
#         return Response({"message": "Loan fully paid off!"}, status=200)

#     # ✅ Hybrid Approach: Adjust due dates dynamically
#     updated_schedules = []
#     remaining_balance = total_remaining_balance
#     for schedule in payment_schedules:
#         if remaining_balance <= 0:
#             break
        
#         if new_amount >= remaining_balance:
#             schedule.payment_amount = remaining_balance
#             schedule.remaining_balance = 0
#             schedule.is_paid = True
#         else:
#             schedule.payment_amount = new_amount
#             schedule.remaining_balance -= new_amount
        
#         schedule.save()
#         updated_schedules.append(schedule)
#         remaining_balance -= new_amount

#     # ✅ Remove extra due dates if overpayment shortens the term
#     unpaid_schedules = PaymentSchedule.objects.filter(id__in=schedules_id, is_paid=False).order_by("due_date")
#     if unpaid_schedules.exists():
#         last_due_date = unpaid_schedules.last().due_date
#     else:
#         last_due_date = None  # Loan is fully paid

#     return Response({
#         "message": "Payment schedules updated successfully",
#         "last_due_date": last_due_date
#     }, status=200)

@api_view(['POST'])
def update_breakdown(request):
    schedules_id = request.data.get('schedules_id', [])
    new_amount = request.data.get('new_amount', None)

    if not schedules_id or new_amount is None:
        return Response({"error": "Missing schedules_id or new_amount"}, status=400)

    try:
        new_amount = Decimal(new_amount)
    except Exception:
        return Response({"error": "Invalid amount format"}, status=400)

    with transaction.atomic():
        payment_schedules = PaymentSchedule.objects.filter(id__in=schedules_id, is_paid=False).order_by('due_date').select_for_update()
        if not payment_schedules.exists():
            return Response({"error": "No matching schedules found"}, status=404)

        # Get the original breakdown amount from the first schedule
        original_breakdown = payment_schedules.first().original_principal
        if original_breakdown is None:
        # Fallback to principal_amount if original_principal is missing
            original_breakdown = payment_schedules.first().principal_amount
        
        if original_breakdown is None:
            return Response({"error": "Original breakdown value is missing."}, status=400)

        if new_amount < original_breakdown:
            return Response({"error": "Breakdown amount cannot be lower than the original breakdown."}, status=400)

        loan = payment_schedules.first().loan
        total_paid = PaymentSchedule.objects.filter(loan=loan, is_paid=True).aggregate(Sum('payment_amount'))['payment_amount__sum'] or Decimal(0)
        remaining_balance = loan.outstanding_balance - total_paid

        if remaining_balance <= 0:
            return Response({"error": "Loan is already fully paid"}, status=400)

        updated_due_dates = []
        first_due_date = payment_schedules.first().due_date
        interval_days = 15

        used_schedule_count = 0

        for schedule in payment_schedules:
            if remaining_balance <= 0:
                schedule.delete()
                continue

            amount_to_assign = min(new_amount, remaining_balance)
            schedule.payment_amount = amount_to_assign
            schedule.principal_amount = amount_to_assign

            if used_schedule_count == 0:
                schedule.due_date = first_due_date
            else:
                schedule.due_date = updated_due_dates[-1] + timedelta(days=interval_days)

            updated_due_dates.append(schedule.due_date)
            schedule.save()

            remaining_balance -= amount_to_assign
            used_schedule_count += 1
            
        # Apply yearly recalculation after breakdown update
        loan.yearly_recalculation()
        loan.save()

    return Response({"message": "Payment schedules updated, duration adjusted"}, status=200)


#allen
@api_view(['POST'])
def revert_to_original_schedule(request):
    print("Reverted to original") #Debugging ah ah
    schedules_id = request.data.get('schedules_id', [])

    if not schedules_id:
        return Response({"error": "Missing schedules_id"}, status=400)

    payment_schedules = PaymentSchedule.objects.filter(id__in=schedules_id)

    if not payment_schedules.exists():
        return Response({"error": "No matching schedules found"}, status=404)

    for schedule in payment_schedules:
        if schedule.original_principal is not None:
            schedule.payment_amount = schedule.original_principal
            schedule.principal_amount = schedule.original_principal
            schedule.save()
            print(f"Schedule {schedule.id} reverted: payment_amount={schedule.payment_amount}, principal_amount={schedule.principal_amount}")

    return Response({"message": "Reverted to original schedule successfully"}, status=200)
#/allen

@api_view(['GET'])
def payment_schedules_by_loan(request, loan_control_number):
    try:
        payment_schedules = PaymentSchedule.objects.filter(loan__control_number=loan_control_number)
        serializer = PaymentScheduleSerializer(payment_schedules, many=True)
        return Response(serializer.data)
    except PaymentSchedule.DoesNotExist:
        return Response({"error": "Payment schedules not found for this loan"}, status=404)
       


class MemberLoanListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        member = request.user.member
        loans = Loan.objects.filter(account__account_holder=member)
        serializer = LoanSerializer(loans, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class PaymentListView(APIView):
    def get(self, request, loan_id, format=None):
        
        try:
            loan = Loan.objects.get(control_number=loan_id)
            payments = Payment.objects.filter(loan=loan)
            serializer = PaymentSerializer(payments, many=True)
            return Response(serializer.data)
        except Loan.DoesNotExist:
            return Response({"error": "Loan not found"}, status=status.HTTP_404_NOT_FOUND)

class AccountDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        account = Account.objects.filter(account_holder=request.user).first()
        
        if not account:
            return Response({"detail": "Account not found."}, status=404)
        
        
        account_serializer = AccountSerializer(account)
        
       
        transactions = Ledger.objects.filter(account_number=account)
        ledger_serializer = LedgerSerializer(transactions, many=True)

        return Response({
            "account": account_serializer.data,
            "transactions": ledger_serializer.data
        })


class LoanSummaryView(APIView):
    def get(self, request):
        
        active_borrowers = Loan.objects.filter(status='Ongoing').values('member').distinct().count()
        paid_off_borrowers = Loan.objects.filter(status='Paid-off').values('member').distinct().count()

        
        total_received = Loan.objects.aggregate(Sum('loan_amount'))['loan_amount__sum'] or 0
        total_returned = Payment.objects.aggregate(Sum('amount_paid'))['amount_paid__sum'] or 0
        # service_fees = Loan.objects.aggregate(Sum('service_fee'))['service_fee__sum'] or 0
        penalties = Loan.objects.aggregate(Sum('penalty_fee'))['penalty_fee__sum'] or 0
        profit = (total_received - total_returned)  + penalties

        
        ongoing_loans = Loan.objects.filter(status='Ongoing').count()
        completed_loans = Loan.objects.filter(status='Paid-off').count()
        

        
        total_payment_schedules = PaymentSchedule.objects.aggregate(Sum('amount_due'))['amount_due__sum'] or 0

        
        total_loans_count = Loan.objects.count()
        total_payments_count = Payment.objects.count()
        
        data = {
            'borrowers': {
                'active': active_borrowers,
                'paidOff': paid_off_borrowers,
            },
            'netTotalLoan': {
                'received': total_received,
                'returned': total_returned,
                'profit': profit,
                'penalties': penalties,
            },
            'loans': {
                'ongoing': ongoing_loans,
                'completed': completed_loans,
                
            },
            'paymentSchedules': total_payment_schedules,
            'totalLoansCount': total_loans_count,
            'totalPaymentsCount': total_payments_count,
        }

        return Response(data)

from django.http import JsonResponse
from .models import Loan
from django.db.models import Sum

from django.db.models import Sum
from django.http import JsonResponse
from .models import Loan

def loan_summary(request):
    active_borrowers = Loan.objects.filter(status='Ongoing').values('account__account_number').distinct().count()
    paid_off_borrowers = Loan.objects.filter(status='Paid-off').values('account__account_number').distinct().count()

    total_net_loan = Loan.objects.aggregate(
        total_loan=Sum('loan_amount')
    )['total_loan'] or 0  

    ongoing_loans = Loan.objects.filter(status='Ongoing').count()
    completed_loans = Loan.objects.filter(status='Paid-off').count()

  
    data = {
        'borrowers': {
            'active': active_borrowers,
            'paidOff': paid_off_borrowers
        },
        'netTotalLoan': {
            'returned': total_net_loan, 
            'profit': 0  
        },
        'loans': {
            'ongoing': ongoing_loans,
            'completed': completed_loans,
        }
    }

    return JsonResponse(data)



class AccountTransactionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, account_number):
        try:
            
            account = Account.objects.get(account_number=account_number)

            if request.user.is_staff:
                transactions = Ledger.objects.filter(account_number=account).order_by('-timestamp')
            elif request.user == account.account_holder.user:
                transactions = Ledger.objects.filter(account_number=account).order_by('-timestamp')
            else:
                return Response({'error': 'You do not have permission to view this ledger.'}, status=status.HTTP_403_FORBIDDEN)

            serializer = LedgerSerializer(transactions, many=True)
            return Response({'transactions': serializer.data})

        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)

class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:  
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        users = User.objects.all()
        data = [{'id': user.id, 'username': user.username, 'email': user.email} for user in users]
        return Response(data)

class ResetPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not request.user.is_staff:  
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        try:
            user = User.objects.get(id=pk)
            new_password = request.data.get('password')
            if not new_password:
                return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
            user.password = make_password(new_password)
            user.save()
            return Response({'message': 'Password reset successful'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Payment
from .serializers import PaymentSerializer

class MemberPaymentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Access the Member profile associated with the authenticated user
            member = request.user.member_profile
            # Get the Account linked to the Member
            account = member.accountN
            # Get the account number
            account_number = account.account_number

            # Fetch payments related to the account number and check for 'Paid' status in Loan
            payments = Payment.objects.filter(
                payment_schedule__loan__account__account_number=account_number,
                payment_schedule__loan__status="Paid"  # Correctly check status in Loan model
            ).select_related('payment_schedule', 'payment_schedule__loan')

            # Serialize the payments and return the response
            serializer = PaymentSerializer(payments, many=True)
            return Response(serializer.data)

        except AttributeError:
            # Handle case where the user doesn't have a linked Member profile or Account
            return Response({'error': 'User does not have an associated member profile or account.'}, status=400)



# @api_view(['GET'])
# def get_payments_by_schedule(request, schedule_id):
#     try:
#         # Fetch the PaymentSchedule by ID
#         payment_schedule = PaymentSchedule.objects.get(id=schedule_id)

#         # Fetch all payments linked to this PaymentSchedule
#         payments = Payment.objects.filter(payment_schedule=payment_schedule)

#         if payments.exists():
#             # Serialize the payments data and send the response
#             serializer = PaymentSerializer(payments, many=True)
#             return Response(serializer.data)
#         else:
#             return Response({"error": "No payments found for this schedule."}, status=status.HTTP_404_NOT_FOUND)
    
#     except PaymentSchedule.DoesNotExist:
#         return Response({"error": "Payment schedule not found."}, status=status.HTTP_404_NOT_FOUND)
# @api_view(['GET'])
# def get_payments_by_schedule(request, schedule_id):
#     try:
#         # Fetch the payment schedule by ID
#         payment_schedule = PaymentSchedule.objects.get(id=schedule_id)
        
#         # Get all payments associated with this schedule
#         payments = Payment.objects.filter(payment_schedule=payment_schedule)
        
#         if payments.exists():
#             serializer = PaymentSerializer(payments, many=True)
#             return Response(serializer.data, status=status.HTTP_200_OK)
#         else:
#             return Response({"error": "No payments found for this payment schedule."}, status=status.HTTP_404_NOT_FOUND)
#     except PaymentSchedule.DoesNotExist:
#         return Response({"error": "Payment schedule not found."}, status=status.HTTP_404_NOT_FOUND)
class PaymentListByScheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, payment_schedule_id, *args, **kwargs):
        try:
            # Get the logged-in user's account
            user_account = request.user.account

            # Get the PaymentSchedule by its ID
            payment_schedule = PaymentSchedule.objects.get(id=payment_schedule_id)

            # Check if the PaymentSchedule belongs to the logged-in user's loan
            if payment_schedule.loan.account != user_account:
                return Response({"detail": "You do not have permission to view these payments."}, status=status.HTTP_403_FORBIDDEN)

            # If the user is authorized, fetch the payments associated with the schedule
            payments = Payment.objects.filter(payment_schedule=payment_schedule)
            serializer = PaymentSerializer(payments, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except PaymentSchedule.DoesNotExist:
            return Response({"detail": "Payment schedule not found."}, status=status.HTTP_404_NOT_FOUND)
        except Loan.DoesNotExist:
            return Response({"detail": "Loan not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
@api_view(['GET'])
def get_payments_by_schedule(request, paymentScheduleId):
    try:
        # Get the payments associated with the given paymentScheduleId
        payments = Payment.objects.filter(payment_schedule_id=paymentScheduleId)
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)
    except PaymentSchedule.DoesNotExist:
        return Response({"error": "Payment schedule not found"}, status=status.HTTP_404_NOT_FOUND)
    



class PaymentsByAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Extract the account_number from query params
        account_number = request.query_params.get('account_number', None)
        
        if not account_number:
            return Response({"error": "Account number is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get the member related to the logged-in user
            user = request.user
            member = user.member_profile  # Ensure the correct relationship
            if not member:
                return Response({"error": "No member found for this user."}, status=status.HTTP_404_NOT_FOUND)

            # Get the account associated with the member
            account = member.account  # Adjust if necessary
            if not account:
                return Response({"error": "No account found for this member."}, status=status.HTTP_404_NOT_FOUND)

            if account.account_number != account_number:
                return Response({"error": "Account number does not match member's account."}, status=status.HTTP_400_BAD_REQUEST)

            # Filter payments based on the account number
            payments = Payment.objects.filter(payment_schedule__loan__account__account_number=account_number)
            
            # If no payments found
            if not payments.exists():
                return Response({"error": "No payments found for this account."}, status=status.HTTP_404_NOT_FOUND)

            # Serialize the payments and return the data
            serializer = PaymentSerializer(payments, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except AttributeError:
            return Response({"error": "Account or Member not found for this user."}, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import AuditLog
from .serializers import AuditLogSerializer

class LogActionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        user = request.user.username  # Get username from the authenticated user
        action_type = data.get('action_type')
        description = data.get('description')

        if not action_type or not description:
            return Response({"error": "Both action_type and description are required."}, status=400)

        # Create audit log
        AuditLog.objects.create(user=user, action_type=action_type, description=description)
        return Response({"message": "Action logged successfully."})

class GetAuditLogsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = AuditLog.objects.all().order_by('-timestamp')  # Sort by latest
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)

class WithdrawView(APIView):
    def post(self, request, account_number):
        try:
            account = Account.objects.get(account_number=account_number)
            amount = request.data.get('amount')

            if not amount or float(amount) <= 0:
                return Response({'message': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

            account.withdraw(amount)
            return Response({'message': 'Withdrawal successful', 'account': str(account)}, status=status.HTTP_200_OK)
        except Account.DoesNotExist:
            return Response({'message': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UpdateStatusView(View):
    def post(self, request, account_number):
        try:
            account = Account.objects.get(account_number=account_number)
            if account.status == 'inactive':
                return JsonResponse({'message': 'Account is already inactive'}, status=400)
            account.status = 'inactive'
            account.save()
            return JsonResponse({'message': 'Account status updated to inactive'}, status=200)
        except Account.DoesNotExist:
            return JsonResponse({'message': 'Account not found'}, status=404)

def archive_account(request, account_id):
    if request.method == "POST":
        account = get_object_or_404(Account, id=account_id)
        
        # Archive the account data
        archived_data = {
            'account_number': account.account_number,
            'account_holder': {
                'first_name': account.account_holder.first_name,
                'middle_name': account.account_holder.middle_name,
                'last_name': account.account_holder.last_name,
            },
            'shareCapital': account.shareCapital,
            'status': account.status,
        }
        
        # Create an archived record
        ArchivedAccount.objects.create(
            archive_type='Account',
            archived_data=archived_data
        )

        # Soft delete by setting status to 'archived'
        account.status = 'archived'
        account.save()

        return JsonResponse({'message': 'Account successfully archived'})
    

@api_view(['DELETE'])
def delete_account(request, account_number):
    try:
        account = Account.objects.get(account_number=account_number)
        account.delete()
        return JsonResponse({'message': 'Account deleted successfully!'}, status=200)
    except Account.DoesNotExist:
        return JsonResponse({'message': 'Account not found!'}, status=404)

class ArchiveView(View):
    def post(self, request):
        data = json.loads(request.body)
        archive_type = data.get('archive_type')
        archived_data = data.get('archived_data')

        if archive_type == 'Account':
            Archive.objects.create(archive_type=archive_type, archived_data=archived_data)
            account_id = archived_data.get('id') 
            account = Account.objects.filter(id=account_id).first()
            if account:
                account.archived = True
                account.save()
                member = account.account_holder
                if member:
                    print(f"Archiving member {member.memId}")  # Debug log
                    member.archive()
            return JsonResponse({'message': 'Account and member archived successfully.'})

        return JsonResponse({'error': 'Invalid archive type.'}, status=400)

def get_members(request):
    members = list(Member.objects.values("id", "name"))  # Convert QuerySet to list
    return JsonResponse({"members": members})

@api_view(['POST'])
def mark_schedule_paid(request, pk):
    try:
        schedule = PaymentSchedule.objects.get(pk=pk)
        schedule.is_paid = True
        schedule.save()

        loan = schedule.loan
        all_paid = PaymentSchedule.objects.filter(loan=loan).exclude(is_paid=True).count() == 0

        if all_paid:
            loan.status = "Paid-off"
            loan.is_archived = True
            loan.save()

            PaymentSchedule.objects.filter(loan=loan).update(is_archived=True)

            member = loan.member
            # Check if all loans of this member are paid
            member_loans = Loan.objects.filter(member=member)
            if all(loan.status == 'Paid-off' for loan in member_loans):
                member.is_archived = True
                member.save()

        return Response({"message": "Payment successful and archive checked."})
    except PaymentSchedule.DoesNotExist:
        return Response({"error": "Schedule not found"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def re_admit_member(request, mem_id):
    try:
        print("Re-Admit triggered for mem_id:", mem_id)

        return Response({"message": "Test success."}, status=200)

    except Exception as e:
        print("Error:", str(e))
        return Response({"error": str(e)}, status=400)
        


def create_archive(request):
    archive_type = request.data.get('archive_type')
    archived_data = request.data.get('archived_data')
    
    if not archive_type or not archived_data:
        return Response(
            {"error": "Both archive_type and archived_data are required."}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        with transaction.atomic():
            # Check for duplicates based on archive type
            if archive_type == 'Loan':
                control_number = archived_data.get('control_number')
                if control_number:
                    existing_archive = Archive.objects.filter(
                        archive_type='Loan',
                        archived_data__control_number=control_number
                    ).first()
                    
                    if existing_archive:
                        return Response(
                            {"error": f"Loan with control number {control_number} is already archived."}, 
                            status=status.HTTP_409_CONFLICT
                        )
            
            elif archive_type == 'Member':
                mem_id = archived_data.get('memId') or archived_data.get('member_id') or archived_data.get('id')
                if mem_id:
                    existing_archive = Archive.objects.filter(
                        archive_type='Member',
                        archived_data__memId=mem_id
                    ).first()
                    
                    if existing_archive:
                        return Response(
                            {"error": f"Member with ID {mem_id} is already archived."}, 
                            status=status.HTTP_409_CONFLICT
                        )
            
            elif archive_type == 'Account':
                account_number = archived_data.get('account_number')
                if account_number:
                    existing_archive = Archive.objects.filter(
                        archive_type='Account',
                        archived_data__account_number=account_number
                    ).first()
                    
                    if existing_archive:
                        return Response(
                            {"error": f"Account {account_number} is already archived."}, 
                            status=status.HTTP_409_CONFLICT
                        )
            
            # Create new archive if no duplicate found
            archive = Archive.objects.create(
                archive_type=archive_type,
                archived_data=archived_data
            )
            
            return Response(
                {
                    "message": f"{archive_type} archived successfully",
                    "archive_id": archive.id
                }, 
                status=status.HTTP_201_CREATED
            )
            
    except Exception as e:
        return Response(
            {"error": f"Error creating archive: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# Also add a method to check for existing archives
def check_archive_exists(request):
    archive_type = request.GET.get('archive_type')
    control_number = request.GET.get('control_number')
    
    if archive_type == 'Loan' and control_number:
        exists = Archive.objects.filter(
            archive_type='Loan',
            archived_data__control_number=control_number
        ).exists()
        
        return Response({"exists": exists}, status=status.HTTP_200_OK)
    
    return Response({"error": "Invalid parameters"}, status=status.HTTP_400_BAD_REQUEST)