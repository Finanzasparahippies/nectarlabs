from storages.backends.s3boto3 import S3Boto3Storage
from django.conf import settings

class R2ContractStorage(S3Boto3Storage):
    access_key = settings.R2_STORAGE_OPTIONS['access_key']
    secret_key = settings.R2_STORAGE_OPTIONS['secret_key']
    bucket_name = settings.R2_STORAGE_OPTIONS['bucket_name']
    endpoint_url = settings.R2_STORAGE_OPTIONS['endpoint_url']
    region_name = settings.R2_STORAGE_OPTIONS['region_name']
    file_overwrite = False
    default_acl = 'private'  # Los contratos deben ser privados
