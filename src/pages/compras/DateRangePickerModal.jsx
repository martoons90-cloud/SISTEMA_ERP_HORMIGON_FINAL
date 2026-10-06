import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, TextField, IconButton
} from '@mui/material';
import { X as XIcon } from 'phosphor-react';

const DateRangePickerModal = ({ open, onClose, onApply, initialDates }) => {
  const [dates, setDates] = useState({ desde: '', hasta: '' });

  useEffect(() => {
    if (open) {
      setDates({
        desde: initialDates.desde || '',
        hasta: initialDates.hasta || ''
      });
    }
  }, [open, initialDates]);

  const handleApply = () => {
    onApply(dates);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDates(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Seleccionar Rango de Fechas
        <IconButton onClick={onClose}><XIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TextField
              name="desde"
              type="date"
              label="Fecha de Inicio"
              value={dates.desde}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="hasta"
              type="date"
              label="Fecha Final"
              value={dates.hasta}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleApply} variant="contained">Aplicar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DateRangePickerModal;

