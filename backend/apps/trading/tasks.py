"""EOD batch: generate the L_ORDERLATENCY CSV from OrderLatencyRecord rows.

Filename convention: L_ORDERLATENCY<YYYYMMDDHHmmss>.csv, written to
TRADING_REPORTS_DIR (default /opt/argus/reports). 9-column schema, QUOTE_MINIMAL.
"""
import csv
import os
from datetime import datetime, timezone

from celery import shared_task

HEADER = [
    "NOREN_ORD_NUM", "EXCH_SEG", "EXT_RMKS", "OMS_STATUS", "OMS_LATENCY",
    "EXCH_STATUS", "OMS_EXCH_CONFIRMATION", "OMSUPDATETIME", "EXCHUPDATETIME",
]


@shared_task(bind=True, max_retries=3, default_retry_delay=300, queue="eod_batch")
def generate_order_latency_csv(self):
    from .models import OrderLatencyRecord

    out_dir = os.environ.get("TRADING_REPORTS_DIR", "/opt/argus/reports")
    os.makedirs(out_dir, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    path = os.path.join(out_dir, f"L_ORDERLATENCY{stamp}.csv")

    with open(path, "w", newline="") as fh:
        writer = csv.writer(fh, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(HEADER)
        for r in OrderLatencyRecord.objects.iterator():
            writer.writerow([
                r.noren_ord_num,
                r.exch_seg,
                r.ext_rmks,
                r.oms_status,
                "" if r.oms_latency is None else r.oms_latency,
                "" if r.exch_status is None else r.exch_status,
                r.oms_exch_confirmation,
                r.oms_update_time,
                r.exch_update_time,
            ])
    return path
