import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Box
} from '@mui/material';

const RangeProgramacionDialog = ({ open, onClose, onConfirm }) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const handleConfirm = () => {
    if (startDate && endDate) {
      onConfirm(startDate, endDate); // onConfirm ahora es handleConfirmRangeProgramacion
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Generar Programación por Rango</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            label="Fecha de Inicio"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            fullWidth
          />
          <TextField
            label="Fecha de Fin"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleConfirm} variant="contained">
          Generar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RangeProgramacionDialog;