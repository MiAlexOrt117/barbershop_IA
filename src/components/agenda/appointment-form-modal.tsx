"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Clock3, Scissors } from "lucide-react";
import { Button, Input, Label, Modal, Select, Textarea } from "@/components/ui";
import { getServiceById } from "@/lib/metrics";
import { useBarbershopStore } from "@/lib/store";
import type { Appointment } from "@/lib/types";

export function AppointmentFormModal({
  open,
  mode,
  appointment,
  slotSelection,
  onClose
}: {
  open: boolean;
  mode: "create" | "edit";
  appointment?: Appointment | null;
  slotSelection?: { barberId: string; start: string } | null;
  onClose: () => void;
}) {
  const { services, barbers, settings, createAppointment, updateAppointment } = useBarbershopStore();
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(settings.openingTime);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && appointment) {
      setClientName(appointment.clientName);
      setClientPhone(appointment.clientPhone);
      setServiceId(appointment.serviceId ?? services[0]?.id ?? "");
      setBarberId(appointment.barberId ?? barbers[0]?.id ?? "");
      setDate(format(new Date(appointment.start), "yyyy-MM-dd"));
      setTime(format(new Date(appointment.start), "HH:mm"));
      setNotes(appointment.notes);
      setError(null);
      return;
    }

    const slotDate = slotSelection ? new Date(slotSelection.start) : new Date(`${format(new Date(), "yyyy-MM-dd")}T${settings.openingTime}:00`);
    setClientName("");
    setClientPhone("");
    setServiceId(services[0]?.id ?? "");
    setBarberId(slotSelection?.barberId ?? barbers[0]?.id ?? "");
    setDate(format(slotDate, "yyyy-MM-dd"));
    setTime(format(slotDate, "HH:mm"));
    setNotes("");
    setError(null);
  }, [appointment, barbers, mode, open, services, settings.openingTime, slotSelection]);

  const selectedService = useMemo(() => getServiceById(services, serviceId), [serviceId, services]);

  function handleSubmit() {
    const start = new Date(`${date}T${time}:00`).toISOString();
    const payload = {
      clientName,
      clientPhone,
      serviceId,
      barberId,
      start,
      notes,
      createdBy: "owner"
    };

    const result =
      mode === "edit" && appointment
        ? updateAppointment(appointment.id, payload)
        : createAppointment(payload);

    if (!result) {
      setError("Ese horario ya está ocupado o quedó bloqueado. Prueba con otro slot.");
      return;
    }

    onClose();
  }

  return (
    <Modal
      open={open}
      title={mode === "edit" ? "Editar cita" : "Nueva cita"}
      description={mode === "edit" ? "Ajusta hora, servicio, barbero o datos del cliente sin salir de la agenda." : "Convierte un slot libre en una cita real en menos de un minuto."}
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Cliente</Label>
          <Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Nombre y apellido" />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="+57 ..." />
        </div>
        <div>
          <Label>Servicio</Label>
          <Select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Barbero</Label>
          <Select value={barberId} onChange={(event) => setBarberId(event.target.value)}>
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div>
          <Label>Hora</Label>
          <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </div>
      </div>

      <div className="mt-4">
        <Label>Notas</Label>
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Preferencias, observaciones o instrucciones internas" />
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
            <p className="flex items-center gap-2 text-slate-400"><Scissors className="h-4 w-4" /> Servicio</p>
            <p className="mt-1 font-semibold text-white">{selectedService?.name ?? "Selecciona un servicio"}</p>
          </div>
          <div className="rounded-2xl bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
            <p className="flex items-center gap-2 text-slate-400"><Clock3 className="h-4 w-4" /> Duración / Precio</p>
            <p className="mt-1 font-semibold text-white">
              {selectedService ? `${selectedService.duration} min · ${settings.currency} ${selectedService.price}` : "Pendiente"}
            </p>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {mode === "edit" ? "Guardar cambios" : "Crear cita"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
