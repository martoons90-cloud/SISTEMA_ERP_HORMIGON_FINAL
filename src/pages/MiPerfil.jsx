import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, TextField, Button, CircularProgress, Avatar } from '@mui/material';
import { useSnackbar } from 'notistack';
import { supabase } from '../supabaseClient';
import { UserCircle } from 'phosphor-react';

const MiPerfil = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    full_name: '',
    direccion: '',
    avatar_url: '',
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('No se pudo encontrar el usuario.');
        }
        setUser(user);

        const { data, error, status } = await supabase
          .from('profiles')
          .select(`full_name, direccion, avatar_url`)
          .eq('id', user.id)
          .single();

        if (error && status !== 406) {
          throw error;
        }

        if (data) {
          setProfile({
            full_name: data.full_name || '',
            direccion: data.direccion || '',
            avatar_url: data.avatar_url || '',
          });
        }
      } catch (error) {
        enqueueSnackbar(`Error cargando el perfil: ${error.message}`, { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [enqueueSnackbar]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const updates = {
        id: user.id,
        full_name: profile.full_name,
        direccion: profile.direccion,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }

      // Actualizar también los metadatos del usuario en auth
      await supabase.auth.updateUser({
        data: { full_name: profile.full_name }
      });


      enqueueSnackbar('Perfil actualizado con éxito.', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(`Error actualizando el perfil: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 200px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" component="h1" fontWeight="bold" gutterBottom>
        Mi Perfil
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Avatar sx={{ width: 100, height: 100 }}>
            <UserCircle size={80} />
          </Avatar>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Email"
            value={user?.email || ''}
            disabled
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Nombre Completo"
            name="full_name"
            value={profile.full_name}
            onChange={handleChange}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Dirección"
            name="direccion"
            value={profile.direccion}
            onChange={handleChange}
            variant="outlined"
            multiline
            rows={2}
          />
        </Grid>
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleUpdateProfile}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Guardar Cambios'}
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default MiPerfil;
