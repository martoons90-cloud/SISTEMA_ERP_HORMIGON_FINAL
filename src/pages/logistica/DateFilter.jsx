import React from 'react';
import { TextField, MenuItem } from '@mui/material';

const DateFilter = ({ dateFilter, onDateFilterChange, ganttDate, onGanttDateChange, viewMode }) => {
  if (viewMode === 'gantt_camiones' || viewMode === 'gantt_plantas') {
    return (
      <TextField
        label="Fecha Gantt"
        type="date"
        value={ganttDate}
        onChange={onGanttDateChange}
        InputLabelProps={{
          shrink: true,
        }}
        size="small"
      />
    );
  }

  return (
    <TextField
      select
      label="Filtrar por Fecha"
      value={dateFilter}
      onChange={onDateFilterChange}
      size="small"
      sx={{ minWidth: 150 }}
    >
      <MenuItem value="hoy">Hoy</MenuItem>
      <MenuItem value="mañana">Mañana</MenuItem>
      <MenuItem value="esta_semana">Esta Semana</MenuItem>
      <MenuItem value="este_mes">Este Mes</MenuItem>
      <MenuItem value="todos">Todos</MenuItem>
    </TextField>
  );
};

export default DateFilter;