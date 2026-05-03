import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { memo } from 'react';

interface GoogleLoginButtonProps {
  onSuccess: (response: CredentialResponse) => void;
  onError: () => void;
}

function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  return (
    <GoogleLogin
      onSuccess={onSuccess}
      onError={onError}
      useOneTap={false}
      shape="rectangular"
      theme="outline"
      size="large"
      width="320"
      text="signin_with"
    />
  );
}

export default memo(GoogleLoginButton);
