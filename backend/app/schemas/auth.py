from datetime import datetime

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import ApiModel


class RegisterRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, max_length=100)

    @field_validator("email")
    @classmethod
    def lower_email(cls, value: str) -> str:
        return value.lower()


class LoginRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def lower_email(cls, value: str) -> str:
        return value.lower()


class UserOut(ApiModel):
    id: int
    email: str
    display_name: str | None
    created_at: datetime


class UpdateProfileRequest(ApiModel):
    display_name: str | None = Field(default=None, max_length=100)


class ChangePasswordRequest(ApiModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class DeleteAccountRequest(ApiModel):
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(ApiModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
