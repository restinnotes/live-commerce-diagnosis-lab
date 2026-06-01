# Balance Validation Data Contract

Public code uses generic source aliases only: `source_live_room_hourly`, `source_live_product_metrics`, `source_transaction_overview`, `source_carrier_composition`, `source_ad_account_metrics`, `source_ad_material_metrics`, `source_finance_metrics_optional`, and `source_inventory_optional`.

Canonical rows include data-quality objects. Missing product-to-SKU mapping disables inventory/profit features. Finance discontinuity disables finance features. Missing ad plan/campaign/attribution fields blocks plan-level optimization.
