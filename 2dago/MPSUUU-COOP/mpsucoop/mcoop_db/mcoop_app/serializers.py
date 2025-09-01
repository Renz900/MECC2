from rest_framework import serializers
from django.contrib.auth.models import User
from decimal import Decimal
from .models import Member, Account, Loan, PaymentSchedule, Payment,Ledger,SystemSettings
from django.contrib.auth import authenticate
from rest_framework.response import Response
from rest_framework import status
import uuid
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Archive
from rest_framework import serializers
from datetime import date, datetime
from typing import Union
from rest_framework import serializers
from datetime import date, datetime
from .models import AuditLog
from rest_framework.views import APIView


class ArchiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Archive
        fields = ['id', 'archive_type', 'archived_data', 'archived_at']

    def validate_archived_data(self, value):
        #  custom validation logic for archived data
        if not isinstance(value, dict):
            raise serializers.ValidationError("Archived data must be a valid dictionary.")
        
       
        for key, val in value.items():
            if isinstance(val, (date, datetime)):
                value[key] = val.strftime('%Y-%m-%d')  
        return value

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        if 'archived_data' in representation:
            archived_data = representation['archived_data']
            for key, value in archived_data.items():
                if isinstance(value, (date, datetime)):
                    archived_data[key] = value.strftime('%Y-%m-%d')  
        return representation



class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = '__all__'
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class RegisterMemberSerializer(serializers.Serializer):
    account_number = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_account_number(self, value):
        if not Account.objects.filter(account_number=value).exists():
            raise serializers.ValidationError("Invalid account number.")
        return value
        
class MemberTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_account = attrs.get("username") or attrs.get("account_number")
        password = attrs.get("password")
        
        # Authenticate user
        user = authenticate(username=username_or_account, password=password)
        if user and hasattr(user, 'member_profile'):
            data = super().validate(attrs)
            
            # Access the member profile
            member = user.member_profile
            print(f"DEBUG: Member profile: {member}")

            # Verify accountN and account_number
            accountN = getattr(member, 'accountN', None)
            if not accountN or not accountN.account_number:
                print("DEBUG: Account information is missing or invalid.")
                raise serializers.ValidationError("Account information is missing or invalid.")
            
            # Add custom fields to the response
            data.update({
                'user_id': user.id,
                'account_number': accountN.account_number,
                'email': user.email,
            })
            print(f"DEBUG: Serialized data: {data}")
            return data
        
        raise serializers.ValidationError("Invalid member credentials.")

class MemberSerializer(serializers.ModelSerializer):
    accountN = serializers.CharField(source='accountN.account_number', read_only=True)
    share_capital = serializers.DecimalField(source='accountN.shareCapital', max_digits=15, decimal_places=2, read_only=True)
    # password = serializers.CharField(write_only=True)
    user = UserSerializer(read_only=True) 

    class Meta:
        model = Member
        fields = '__all__'

    def get_accountN(self, obj):
        return obj.accountN.account_number if hasattr(obj, 'accountN') else None
    


    def create(self, validated_data):
        account_data = validated_data.pop('accountN', None)
        validated_data['user'] = None  

        member = Member.objects.create(**validated_data)

        if account_data:
            Account.objects.create(account_holder=member, **account_data)

        return member

class AccountSerializer(serializers.ModelSerializer):
    account_holder = MemberSerializer(read_only=True)
    class Meta:
        model = Account
        fields = ['account_number', 'account_holder', 'shareCapital', 'status', 'created_at', 'updated_at']
class UpdatePasswordSerializer(serializers.Serializer):
    account_number = serializers.CharField(max_length=20)
    email = serializers.EmailField()

    username = serializers.CharField(max_length=20)
    new_password = serializers.CharField(write_only=True, min_length=8)
class PaymentScheduleSerializer(serializers.ModelSerializer):
    loan_type = serializers.CharField(source='loan.loan_type', read_only=True)
    loan_amount = serializers.DecimalField(source='loan.loan_amount', max_digits=10, decimal_places=2,default=Decimal('0.00'))
    loan_date = serializers.DateField(source='loan.loan_date', read_only=True)
    payment_amount = serializers.FloatField()
    received_amnt = serializers.FloatField()
    class Meta:
        model = PaymentSchedule
        fields = ['id', 'loan', 'principal_amount', 'payment_amount','advance_pay','under_pay','received_amnt','penalty',
                  'due_date', 'balance', 'is_paid',  'loan_type', 'loan_amount', 'loan_date']

class LoanSerializer(serializers.ModelSerializer):
    payment_schedules = PaymentSchedule.objects.select_related('loan').all()
    control_number = serializers.ReadOnlyField()
    # bi_monthly_installment = serializers.SerializerMethodField()
    payment_schedule = PaymentScheduleSerializer(source='paymentschedule_set', many=True, read_only=True)
    account_holder = serializers.SerializerMethodField()

    class Meta:
        model = Loan
        fields = ['control_number', 'account', 'loan_amount', 'loan_type', 'interest_amount','system_settings','service_fee',
                  'loan_period', 'loan_period_unit', 'loan_date', 'due_date', 'status', 'takehomePay', 'cisp', 'admincost', 'notarial', 'outstanding_balance', 
                  'purpose',  'payment_schedule','account_holder','co_maker','co_maker_2','co_maker_3','co_maker_4','co_maker_5']
        read_only_fields = ['control_number', 'loan_date', 'due_date', 'interest_amount',  ]
        
    def get_account_holder(self, obj):
        if obj.account and obj.account.account_holder:
            member = obj.account.account_holder
            return f"{member.first_name} {member.middle_name or ''} {member.last_name}".strip()
        return "N/A"
    def validate_account_holder(self, value):
        if not value:
            raise serializers.ValidationError("Account Holder is required.")
        return value
    def validate_control_number(self, value):
        try:
            uuid.UUID(str(value))
        except ValueError:
            raise serializers.ValidationError("Invalid UUID format.")
        return value

    def create(self, validated_data):
        loan = Loan.objects.create(**validated_data)
        if loan.status == 'Ongoing':
            loan.generate_payment_schedule()
        return loan
        return instance
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.calculate_service_fee()
        instance.calculate_takehomePay()
        instance.calculate_outstanding_balance()
        instance.calculate_interest()
        instance.calculate_cisp()
        instance.save()
        return instance


class PaymentSerializer(serializers.ModelSerializer):
    
        class Meta:
            model = Payment
            fields = '__all__'
            
        def to_representation(self, instance):
            data = super().to_representation(instance)
            data['control_number'] = str(instance.control_number)
            return data
class LedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ledger
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ['id', 'action_type', 'description', 'user', 'timestamp']

class WithdrawView(APIView):
    def post(self, request, account_number):
        try:
            account = Account.objects.get(account_number=account_number)
            amount = request.data.get('amount')

            if not amount or float(amount) <= 0:
                return Response({'message': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

            amount = float(amount)

            if account.shareCapital < amount:
                return Response({'message': 'Insufficient share capital'}, status=status.HTTP_400_BAD_REQUEST)

            account.shareCapital -= amount

            if account.shareCapital <= 0:
                account.shareCapital = 0  
                account.status = 'Inactive'

            account.save()

            return Response(AccountSerializer(account).data, status=status.HTTP_200_OK)
        except Account.DoesNotExist:
            return Response({'message': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UpdateStatusView(APIView):
    def patch(self, request, account_number):
        try:
            account = Account.objects.get(account_number=account_number)
            status_update = request.data.get('status')

            if status_update not in ['Active', 'Inactive']:
                return Response({'message': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

            account.status = status_update
            account.save()

            return Response(AccountSerializer(account).data, status=status.HTTP_200_OK)
        except Account.DoesNotExist:
            return Response({'message': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        fields = ['id', 'action_type', 'description', 'user', 'timestamp']