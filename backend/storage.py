import boto3
import os
from botocore.exceptions import ClientError

BUCKET = os.getenv("S3_BUCKET_NAME", "vibeshift-audio-storage")


def _s3():
    return boto3.client(
        "s3",
        region_name=os.getenv("AWS_REGION", "ap-southeast-1"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )


def upload_bytes(data: bytes, s3_key: str, content_type: str = "audio/wav") -> str:
    _s3().put_object(Bucket=BUCKET, Key=s3_key, Body=data, ContentType=content_type)
    return s3_key


def get_presigned_url(s3_key: str, expires_in: int = 3600) -> str:
    return _s3().generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET, "Key": s3_key},
        ExpiresIn=expires_in,
    )


def download_bytes(s3_key: str) -> bytes:
    response = _s3().get_object(Bucket=BUCKET, Key=s3_key)
    return response["Body"].read()


def delete_object(s3_key: str):
    _s3().delete_object(Bucket=BUCKET, Key=s3_key)


def content_type_for(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    return "audio/mpeg" if ext == "mp3" else "audio/wav"