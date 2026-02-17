"""
Servicio para gestionar el historial de métricas diarias
"""

import json
import os
from datetime import datetime, date, timezone, timedelta
from typing import List, Dict, Optional
import logging
import pytz

CR_TZ = pytz.timezone('America/Costa_Rica')

logger = logging.getLogger(__name__)

def get_utc_now():
    """Obtener fecha/hora actual en UTC con formato ISO"""
    return datetime.now(timezone.utc).isoformat()

class MetricsHistoryService:
    """Servicio para gestionar métricas históricas agregadas"""

    def __init__(self, retention_days: int = 30):
        # Ruta al archivo de historial de métricas
        self.metrics_file = os.path.join(
            os.path.dirname(__file__),
            '..',
            '..',
            'metrics_history.json'
        )
        self.retention_days = retention_days
        logger.info(f"MetricsHistoryService inicializado - archivo: {self.metrics_file}")

    def save_daily_snapshot(
        self,
        date_str: str,
        total_conversations: int,
        whatsapp_conversations: int,
        teams_conversations: int,
        total_messages: int,
        unique_users: int,
        escalations_created: int,
        escalations_resolved: int,
        avg_response_time_seconds: Optional[float] = None
    ) -> bool:
        """
        Guardar snapshot diario de métricas

        Args:
            date_str: Fecha en formato YYYY-MM-DD
            total_conversations: Total de conversaciones del día
            whatsapp_conversations: Conversaciones por WhatsApp
            teams_conversations: Conversaciones por Teams
            total_messages: Total de mensajes
            unique_users: Usuarios únicos
            escalations_created: Escalaciones creadas
            escalations_resolved: Escalaciones resueltas
            avg_response_time_seconds: Tiempo promedio de respuesta en segundos

        Returns:
            True si se guardó correctamente, False si hubo error
        """
        try:
            history = self._load_history()

            # Verificar si ya existe un snapshot para esta fecha
            existing_index = None
            for i, entry in enumerate(history):
                if entry.get('date') == date_str:
                    existing_index = i
                    break

            # Crear nuevo snapshot
            snapshot = {
                "date": date_str,
                "total_conversations": total_conversations,
                "whatsapp_conversations": whatsapp_conversations,
                "teams_conversations": teams_conversations,
                "total_messages": total_messages,
                "unique_users": unique_users,
                "escalations_created": escalations_created,
                "escalations_resolved": escalations_resolved,
                "avg_response_time_seconds": avg_response_time_seconds,
                "saved_at": get_utc_now()
            }

            # Calcular métricas derivadas
            if total_conversations > 0:
                snapshot['bot_success_rate'] = round(
                    ((total_conversations - escalations_created) / total_conversations * 100), 2
                )
            else:
                snapshot['bot_success_rate'] = 0

            if escalations_created > 0:
                snapshot['escalation_resolution_rate'] = round(
                    (escalations_resolved / escalations_created * 100), 2
                )
            else:
                snapshot['escalation_resolution_rate'] = 0

            # Actualizar o agregar
            if existing_index is not None:
                history[existing_index] = snapshot
                logger.info(f"📊 Snapshot actualizado para {date_str}")
            else:
                history.append(snapshot)
                logger.info(f"📊 Nuevo snapshot creado para {date_str}")

            # Limpiar snapshots antiguos (mantener solo los últimos retention_days)
            history = self._cleanup_old_snapshots(history)

            # Guardar
            return self._save_history(history)

        except Exception as e:
            logger.error(f"❌ Error guardando snapshot diario: {e}", exc_info=True)
            return False

    def get_last_n_days(self, n: int = 7) -> List[Dict]:
        """
        Obtener snapshots de los últimos N días

        Args:
            n: Número de días a obtener

        Returns:
            Lista de snapshots ordenados por fecha (más reciente primero)
        """
        try:
            history = self._load_history()

            # Ordenar por fecha descendente
            history.sort(key=lambda x: x.get('date', ''), reverse=True)

            return history[:n]

        except Exception as e:
            logger.error(f"❌ Error obteniendo últimos {n} días: {e}")
            return []

    def get_date_range(self, start_date: str, end_date: str) -> List[Dict]:
        """
        Obtener snapshots en un rango de fechas

        Args:
            start_date: Fecha inicial (YYYY-MM-DD)
            end_date: Fecha final (YYYY-MM-DD)

        Returns:
            Lista de snapshots en el rango
        """
        try:
            history = self._load_history()

            filtered = [
                entry for entry in history
                if start_date <= entry.get('date', '') <= end_date
            ]

            # Ordenar por fecha ascendente
            filtered.sort(key=lambda x: x.get('date', ''))

            return filtered

        except Exception as e:
            logger.error(f"❌ Error obteniendo rango de fechas: {e}")
            return []

    def get_trend(self, metric_name: str, days: int = 7) -> float:
        """
        Calcular tendencia de una métrica (diferencia porcentual)

        Args:
            metric_name: Nombre de la métrica
            days: Días a comparar

        Returns:
            Diferencia porcentual (positivo = mejora, negativo = empeoramiento)
        """
        try:
            snapshots = self.get_last_n_days(days + 1)

            if len(snapshots) < 2:
                return 0

            # Comparar el día más reciente con el promedio de días anteriores
            latest = snapshots[0].get(metric_name, 0)
            previous_values = [s.get(metric_name, 0) for s in snapshots[1:] if s.get(metric_name) is not None]

            if not previous_values:
                return 0

            previous_avg = sum(previous_values) / len(previous_values)

            if previous_avg == 0:
                return 0

            # Calcular diferencia porcentual
            trend = ((latest - previous_avg) / previous_avg) * 100

            return round(trend, 1)

        except Exception as e:
            logger.error(f"❌ Error calculando tendencia: {e}")
            return 0

    def _load_history(self) -> List[Dict]:
        """Cargar historial desde el archivo JSON"""
        try:
            if os.path.exists(self.metrics_file):
                with open(self.metrics_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                return []
        except Exception as e:
            logger.error(f"Error leyendo archivo de historial: {e}")
            return []

    def _save_history(self, history: List[Dict]) -> bool:
        """Guardar historial en el archivo JSON"""
        try:
            with open(self.metrics_file, 'w', encoding='utf-8') as f:
                json.dump(history, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error guardando historial: {e}")
            return False

    def _cleanup_old_snapshots(self, history: List[Dict]) -> List[Dict]:
        """
        Limpiar snapshots antiguos

        Args:
            history: Lista completa de snapshots

        Returns:
            Lista filtrada con solo los últimos retention_days
        """
        cutoff_date = (datetime.now(CR_TZ).date() - timedelta(days=self.retention_days)).isoformat()

        filtered = [
            entry for entry in history
            if entry.get('date', '') >= cutoff_date
        ]

        removed_count = len(history) - len(filtered)
        if removed_count > 0:
            logger.info(f"🧹 {removed_count} snapshots antiguos eliminados")

        return filtered
