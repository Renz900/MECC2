from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import (
    MemberViewSet, 
    AccountViewSet, 
    LoanViewSet,
    PaymentScheduleViewSet,
    PaymentViewSet,
    UpdateMemberViews,
    update_breakdown,revert_to_original_schedule,
    UserListView, ResetPasswordView,
    ActiveLoansByAccountView,RegisterMemberView, AccountTransactionView, MemberLoginView,LogoutView, MemberProfileView, MemberLoanListView, TokenObtainPairView, SystemSettingsView,
    payment_schedules_by_loan, AccountDetailView, get_payments, MemberPaymentsView,PaymentListByScheduleView, PaymentsByAccountView, ArchiveViewSet,loan_summary, LogActionAPIView, GetAuditLogsAPIView,process_payment_view
)
from rest_framework_simplejwt import views as jwt_views
import logging
from .views import WithdrawView
from .views import UpdateStatusView
from .views import get_members
# from mcoop_app.views import AuditTrailView


logger = logging.getLogger(__name__)
router = DefaultRouter()
router.register(r'members', MemberViewSet )  
router.register(r'accounts', AccountViewSet)
router.register(r'loans', LoanViewSet) 
router.register(r'payment-schedules', PaymentScheduleViewSet, basename='payment-schedules')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'archives', ArchiveViewSet, basename='archived-records')

urlpatterns = [
    path('', include(router.urls)),
    path('users/', UserListView.as_view(), name='user_list'),
    path('api/loan-summary/', views.loan_summary, name='loan_summary'),
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('reset-password/<uidb64>/<token>/', views.reset_password, name='reset-password'),
    path('accounts/<str:account_number>/sharecapital/', views.get_account_sharecapital, name='get_account_sharecapital'),
    # path('api/archived-records/', ArchivedRecordsView.as_view(), name='archived_records'),
    path('api/account/<str:account_number>/transactions/', AccountTransactionView.as_view(), name='account-transactions'),
    path('users/<int:pk>/reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('update-breakdown/', views.update_breakdown, name='update-breakdown'),
    path('revert-to-original/', views.revert_to_original_schedule, name='revert-to-original'), 
    path('update-user-password/', UpdateMemberViews.as_view(), name="update-user-password"),
    path('payment-schedules/<int:id>/mark-paid/', views.mark_as_paid, name='mark_as_paid'),
    path('register/', RegisterMemberView.as_view(), name='register_member'),  
    path('login/member/', views.member_login, name='member-login'),   
    path('login/admin/', jwt_views.TokenObtainPairView.as_view(), name='admin_login'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', jwt_views.TokenRefreshView.as_view(), name='token_refresh'),  
    path('api/member/profile/', MemberProfileView.as_view(), name='member-profile'),
    path('api/logout/', LogoutView.as_view(), name='logout'),
    path('api/system-settings/', SystemSettingsView.as_view(), name='system-settings'),
    path('api/loans/by_account/', LoanViewSet.as_view({'get': 'by_account'})),
    path('api/payment-schedules/<str:loan_control_number>/', payment_schedules_by_loan, name='payment-schedules-by-loan'),
    path('api/loans/<uuid:control_number>/', LoanViewSet.as_view({'get': 'retrieve'})),
    path('api/payments/<uuid:control_number>/', views.get_payments, name='get_payments'),
    path('api/member-payments/', MemberPaymentsView.as_view(), name='member-payments'),
    path('api/account/details/', AccountDetailView.as_view(), name='account-details'),
    path('payments/<int:payment_schedule_id>/', PaymentListByScheduleView.as_view(), name='payment-list-by-schedule'),
    path('api/payments/<int:paymentScheduleId>/', views.get_payments_by_schedule, name='get_payments_by_schedule'),
    path('api/payments/by_account/', PaymentsByAccountView.as_view(), name='payments-by-account'),
    path('log-action/', LogActionAPIView.as_view(), name='log_action'),
    path('audit-logs/', GetAuditLogsAPIView.as_view(), name='audit_logs'),
    # Optionally log or print when Django processes a request to the API
    path('accounts/<str:account_number>/withdraw/', WithdrawView.as_view(), name='withdraw'),
    path('accounts/<str:account_number>/update-status/', UpdateStatusView.as_view(), name='update-status'),
    path('delete-account/<str:account_number>/', views.delete_account, name='delete_account'),
    path("get-members/", get_members, name="get-members"),
    # path('api/audit-trail/', AuditTrailView.as_view(), name='audit-trail'),

    path('payment-schedule/<int:pk>/process-payment/', process_payment_view, name='process-payment'),
    path('re-admit-member/<int:mem_id>/', views.re_admit_member, name='re_admit_member'),

    
]   
def log_request(request):
    logger.info(f"Request made to: {request.path}")