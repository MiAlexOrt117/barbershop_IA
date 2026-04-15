export function sanitizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export function buildWhatsAppLink(phone: string, message: string) {
  const sanitized = sanitizePhone(phone);
  return `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
}