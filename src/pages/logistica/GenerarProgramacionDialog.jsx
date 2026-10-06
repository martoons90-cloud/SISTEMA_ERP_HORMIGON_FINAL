import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, Typography } from '@mui/material';

const GenerarProgramacionDialog = ({ open, onClose, onGenerate }) => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);

    const handleGenerateClick = () => {
        if (!startDate || !endDate || endDate < startDate) {
            // Se podría mejorar con un snackbar en el futuro
            alert("Por favor, seleccione un rango de fechas válido.");
            return;
        }
        onGenerate(startDate, endDate);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Generar Programación por Rango</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2, mt: 1 }}>
                    Seleccione el rango de fechas para el cual desea generar la programación automática.
                </Typography>
                <Grid container spacing={2}>
                    <Grid xs={12} sm={6}>
                        <TextField
                            fullWidth
                            type="date"
                            label="Fecha de Inicio"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid xs={12} sm={6}>
                        <TextField
                            fullWidth
                            type="date"
                            label="Fecha de Fin"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: startDate }}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleGenerateClick} variant="contained">Generar</Button>
            </DialogActions>
        </Dialog>
    );
};

export default GenerarProgramacionDialog;
