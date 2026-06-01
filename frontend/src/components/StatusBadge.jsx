import { CheckCircle2, MinusCircle, AlertTriangle, XCircle } from 'lucide-react';

/**
 * StatusBadge — renders a colored pill badge for entity status values.
 */
export default function StatusBadge({ status }) {
  const config = {
    active:       { cls: 'badge-active',       icon: <CheckCircle2  size={11} strokeWidth={2.5} /> },
    inactive:     { cls: 'badge-inactive',     icon: <MinusCircle   size={11} strokeWidth={2.5} /> },
    unsubscribed: { cls: 'badge-unsubscribed', icon: <AlertTriangle size={11} strokeWidth={2.5} /> },
    bounced:      { cls: 'badge-bounced',      icon: <XCircle       size={11} strokeWidth={2.5} /> },
    senders:      { cls: 'badge-senders',      icon: null },
    recipients:   { cls: 'badge-recipients',   icon: null },
  };

  const { cls, icon } = config[status] || { cls: 'badge-inactive', icon: null };

  return (
    <span className={`badge ${cls}`}>
      {icon}
      {status}
    </span>
  );
}
