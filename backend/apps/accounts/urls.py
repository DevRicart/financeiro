from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("verify-email/", views.VerifyEmailView.as_view(), name="auth-verify-email"),
    path("resend-verification/", views.ResendVerificationView.as_view(), name="auth-resend-verification"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("password-reset/", views.PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path(
        "password-reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="auth-password-reset-confirm",
    ),
    path("change-password/", views.ChangePasswordView.as_view(), name="auth-change-password"),
    path("delete-account/", views.DeleteAccountView.as_view(), name="auth-delete-account"),
    path("me/", views.MeView.as_view(), name="auth-me"),
]
