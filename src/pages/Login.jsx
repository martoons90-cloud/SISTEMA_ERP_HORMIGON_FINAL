import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../supabaseClient';
import { Box, Typography, Paper, useTheme } from '@mui/material';

const Login = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Paper sx={{ p: 4, width: '100%', maxWidth: '420px' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight="bold">
          HormiApp ERP
        </Typography>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme={theme.palette.mode}
          providers={['google']} // Puedes añadir 'github', 'facebook', etc.
          localization={{
            variables: {
              sign_in: {
                email_label: 'Correo electrónico',
                password_label: 'Contraseña',
                email_input_placeholder: 'Tu correo electrónico',
                password_input_placeholder: 'Tu contraseña',
                button_label: 'Iniciar sesión',
                social_provider_text: 'Iniciar con {{provider}}',
                link_text: '¿Ya tienes una cuenta? Inicia sesión',
              },
              sign_up: {
                email_label: 'Correo electrónico',
                password_label: 'Contraseña',
                email_input_placeholder: 'Tu correo electrónico',
                password_input_placeholder: 'Tu contraseña',
                button_label: 'Registrarse',
                social_provider_text: 'Registrarse con {{provider}}',
                link_text: '¿No tienes cuenta? Regístrate',
              },
              forgotten_password: {
                email_label: 'Correo electrónico',
                email_input_placeholder: 'Tu correo electrónico',
                button_label: 'Enviar instrucciones',
                link_text: '¿Olvidaste tu contraseña?',
              },
            },
          }}
        />
      </Paper>
    </Box>
  );
};

export default Login;
