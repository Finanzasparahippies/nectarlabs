import logging
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from storages.backends.s3boto3 import S3Boto3Storage

class R2ContractStorage:
    def __new__(cls, *args, **kwargs):
        # En modo DEBUG (Local) o si falta configuración crítica, usamos el disco duro
        config = settings.R2_STORAGE_OPTIONS
        has_r2_config = all([config.get('access_key'), config.get('secret_key'), config.get('endpoint_url')])

        if settings.DEBUG or not has_r2_config:
            if not settings.DEBUG:
                logging.warning("STORAGE: R2 configuration incomplete, falling back to local storage")
            else:
                logging.info("STORAGE: Using Local FileSystemStorage (DEBUG MODE)")
            
            return FileSystemStorage(location=settings.MEDIA_ROOT / 'contracts', base_url='/media/contracts/')
        
        # En producción con configuración completa, usamos Cloudflare R2
        logging.info("STORAGE: Using Cloudflare R2 Storage (PRODUCTION MODE)")
        kwargs.update({
            'access_key': config.get('access_key'),
            'secret_key': config.get('secret_key'),
            'bucket_name': config.get('bucket_name'),
            'endpoint_url': config.get('endpoint_url'),
            'region_name': config.get('region_name', 'auto'),
            'file_overwrite': False,
            'default_acl': 'private',
            'signature_version': 's3v4',
            'addressing_style': 'path',
        })
        return S3Boto3Storage(*args, **kwargs)
