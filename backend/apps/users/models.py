from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Administrator')
        BUSINESS = 'BUSINESS', _('Business Owner')
        ANALYST = 'ANALYST', _('Data Analyst')
        CUSTOMER = 'CUSTOMER', _('Customer')
        DESIGNER = 'DESIGNER', _('Designer')
        DEVELOPER = 'DEVELOPER', _('Developer')
        SALES = 'SALES', _('Salesperson')
        STAFF = 'STAFF', _('Staff')

    email = models.EmailField(_('email address'), unique=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER
    )
    phone = models.CharField(max_length=15, blank=True, null=True)
    tenant = models.ForeignKey(
        'tenants.Tenant', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='users'
    )
    is_approved_seller = models.BooleanField(
        default=False,
        help_text="Indica si el vendedor está aprobado para generar comisiones."
    )
    is_email_verified = models.BooleanField(
        default=False,
        help_text="Indica si el correo electrónico ha sido verificado."
    )
    
    # Use email as the primary identifier
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def is_business_admin(self):
        return self.role in [self.Role.ADMIN, self.Role.BUSINESS]

    @property
    def is_data_analyst(self):
        return self.role in [self.Role.ADMIN, self.Role.ANALYST]
