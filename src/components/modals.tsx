"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { useBarbershopStore } from "@/lib/store";
import { Button, Input, Label, Modal, Select, Textarea } from "./ui";
import { getServiceById } from "@/lib/metrics";

export function WalkInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { services, barbers, createWalkIn, settings } = useBarbershopStore();
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("Llegó sin cita");

  const selectedService = useMemo(() => getServiceById(services, serviceId), [services, serviceId]);

  function handleSubmit() {
    const start = new Date(`${date}T${time}:00`);
    createWalkIn({
      clientName,
      clientPhone,
      serviceId,
      barberId,
      start: start.toISOString(),
      notes
    });
    onClose();
    setClientName("");
    setClientPhone("");
  }

  return (
    <Modal open={open} title="Registrar walk-in" description="Bloquea el espacio de inmediato y deja la cita lista para la agenda." onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Nombre del cliente</Label>
          <Input value={clientName} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setClientName(event.target.value)} placeholder="Nombre y apellido" />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input value={clientPhone} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setClientPhone(event.target.value)} placeholder="+52 ..." />
        </div>
        <div>
          <Label>Servicio</Label>
          <Select value={serviceId} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setServiceId(event.target.value)}>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</Select>
        </div>
        <div>
          <Label>Barbero</Label>
          <Select value={barberId} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setBarberId(event.target.value)}>{barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}</Select>
        </div>
        <div>
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDate(event.target.value)} />
        </div>
        <div>
          <Label>Hora</Label>
          <Input type="time" value={time} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTime(event.target.value)} />
        </div>
      </div>
      <div className="mt-4">
        <Label>Notas</Label>
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <span>{selectedService ? `${selectedService.duration} min · ${settings.currency} ${selectedService.price}` : "Servicio seleccionado"}</span>
        <Button variant="primary" onClick={handleSubmit}>Guardar walk-in</Button>
      </div>
    </Modal>
  );
}

export function EmergencyCloseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { closeAgendaForDay } = useBarbershopStore();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  function handleClose() {
    closeAgendaForDay(new Date(`${date}T00:00:00`).toISOString());
    onClose();
  }

  return (
    <Modal open={open} title="Cerrar agenda" description="Bloquea el resto del día para contingencias o cierre operativo." onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Label>Fecha a cerrar</Label>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <Button variant="danger" onClick={handleClose}>Cerrar agenda completa</Button>
      </div>
    </Modal>
  );
}

export function CancelAppointmentModal({ open, onClose, appointmentId, clientName, phone, onConfirm }: { open: boolean; onClose: () => void; appointmentId: string | null; clientName: string; phone: string; onConfirm: (id: string, notify: boolean) => void; }) {
  const [notify, setNotify] = useState(true);
  const link = buildWhatsAppLink(phone, `Hola ${clientName}, tu cita fue cancelada. Si deseas reagendar, responde este mensaje y te compartimos disponibilidad.`);

  return (
    <Modal open={open} title="Cancelar cita" description="Puedes notificar al cliente con un enlace de WhatsApp prellenado." onClose={onClose}>
      <div className="space-y-4 text-sm text-slate-300">
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />
          Enviar mensaje por WhatsApp al cliente
        </label>
        <div className="flex flex-wrap gap-3">
          <Button variant="danger" onClick={() => { if (appointmentId) onConfirm(appointmentId, notify); onClose(); }}>
            Confirmar cancelación
          </Button>
          {notify ? <Button variant="secondary" onClick={() => window.open(link, "_blank", "noopener,noreferrer")}>Abrir WhatsApp</Button> : null}
        </div>
      </div>
    </Modal>
  );
}