import { SupabaseClient } from '@supabase/supabase-js'

export type AuditEntity =
  | 'dispensa'
  | 'caja'
  | 'venta'
  | 'pago'
  | 'socio'
  | 'solicitud'
  | 'stock'
  | 'producto'
  | 'proveedor'
  | 'evento'
  | 'config'
  | 'cuenta_corriente'
  | 'checkout'
  | 'egreso_caja'

export type AuditAction =
  | 'crear'
  | 'editar'
  | 'eliminar'
  | 'anular'
  | 'abrir'
  | 'cerrar'
  | 'reabrir'
  | 'aprobar'
  | 'rechazar'
  | 'dispensar'
  | 'pagar'
  | 'reversar'

interface LogActivityParams {
  admin: SupabaseClient
  userId: string
  userName: string
  action: AuditAction
  entity: AuditEntity
  entityId?: string
  description: string
  metadata?: Record<string, unknown>
}

/**
 * Registra una acción de negocio en activity_log.
 * Fire-and-forget: no bloquea ni rompe la operación principal si falla.
 */
export async function logActivity({
  admin,
  userId,
  userName,
  action,
  entity,
  entityId,
  description,
  metadata = {},
}: LogActivityParams): Promise<void> {
  try {
    await admin.from('activity_log').insert({
      user_id: userId,
      user_name: userName,
      action,
      entity,
      entity_id: entityId,
      description,
      metadata,
    })
  } catch (err) {
    // Fire-and-forget: log to console but never break the main operation
    console.error('[audit] Error logging activity:', err)
  }
}

/**
 * Helper para obtener el nombre del usuario desde el perfil.
 */
export async function getUserName(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()
  return data?.full_name ?? 'Usuario desconocido'
}
