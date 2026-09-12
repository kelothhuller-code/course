export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing in production!');
    }
    return 'dev_widetechnos_fallback_jwt_secret_key_2027';
  }
  return secret;
};
