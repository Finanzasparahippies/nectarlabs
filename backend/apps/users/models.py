from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Administrator')
        BUSINESS = 'BUSINESS', _('Business Owner')
        ANALYST = 'ANALYST', _('Data Analyst')
        CUSTOMER = 'CUSTOMER', _('Customer')

    email = models.EmailField(_('email address'), unique=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER
    )
    phone = models.CharField(max_length=15, blank=True, null=True)
    
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
