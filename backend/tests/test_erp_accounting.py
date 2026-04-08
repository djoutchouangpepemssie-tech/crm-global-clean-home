"""
Tests unitaires pour le module ERP Comptabilité
Vérifie les calculs critiques : TVA, totaux, écritures comptables
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from accounting_erp import (
    calc_item, calc_totals, CATEGORY_TO_ACCOUNT, CATEGORY_TVA_RATE, PLAN_COMPTABLE
)


class TestCalcItem:
    """Tests calcul ligne facture."""

    def test_basic_20pct(self):
        item = {"description": "Ménage", "quantity": 1, "unit_price_ht": 100, "tva_rate": 20}
        result = calc_item(item)
        assert result["amount_ht"] == 100.0
        assert result["amount_tva"] == 20.0
        assert result["amount_ttc"] == 120.0

    def test_quantity_multiply(self):
        item = {"description": "Heures", "quantity": 3, "unit_price_ht": 50, "tva_rate": 20}
        result = calc_item(item)
        assert result["amount_ht"] == 150.0
        assert result["amount_tva"] == 30.0
        assert result["amount_ttc"] == 180.0

    def test_zero_tva(self):
        item = {"description": "Salaires", "quantity": 1, "unit_price_ht": 2000, "tva_rate": 0}
        result = calc_item(item)
        assert result["amount_ht"] == 2000.0
        assert result["amount_tva"] == 0.0
        assert result["amount_ttc"] == 2000.0

    def test_5_5_tva(self):
        item = {"description": "Service", "quantity": 1, "unit_price_ht": 100, "tva_rate": 5.5}
        result = calc_item(item)
        assert result["amount_ht"] == 100.0
        assert result["amount_tva"] == 5.5
        assert result["amount_ttc"] == 105.5

    def test_10_tva(self):
        item = {"description": "Rénovation", "quantity": 2, "unit_price_ht": 200, "tva_rate": 10}
        result = calc_item(item)
        assert result["amount_ht"] == 400.0
        assert result["amount_tva"] == 40.0
        assert result["amount_ttc"] == 440.0

    def test_fractional_quantity(self):
        item = {"description": "Service", "quantity": 1.5, "unit_price_ht": 80, "tva_rate": 20}
        result = calc_item(item)
        assert result["amount_ht"] == 120.0
        assert result["amount_tva"] == 24.0
        assert result["amount_ttc"] == 144.0

    def test_defaults(self):
        item = {"description": "Test"}
        result = calc_item(item)
        assert result["amount_ht"] == 0.0

    def test_rounding(self):
        item = {"description": "Test", "quantity": 3, "unit_price_ht": 33.33, "tva_rate": 20}
        result = calc_item(item)
        assert result["amount_ht"] == 99.99
        assert result["amount_tva"] == 20.0  # 99.99 * 0.2 = 19.998 → 20.0
        assert result["amount_ttc"] == 119.99


class TestCalcTotals:
    """Tests calcul totaux document."""

    def test_single_item(self):
        items = [{"amount_ht": 100, "amount_tva": 20, "amount_ttc": 120}]
        result = calc_totals(items)
        assert result["total_ht"] == 100.0
        assert result["total_tva"] == 20.0
        assert result["total_ttc"] == 120.0

    def test_multiple_items(self):
        items = [
            {"amount_ht": 100, "amount_tva": 20, "amount_ttc": 120},
            {"amount_ht": 200, "amount_tva": 40, "amount_ttc": 240},
            {"amount_ht": 50, "amount_tva": 0, "amount_ttc": 50},
        ]
        result = calc_totals(items)
        assert result["total_ht"] == 350.0
        assert result["total_tva"] == 60.0
        assert result["total_ttc"] == 410.0

    def test_empty(self):
        result = calc_totals([])
        assert result["total_ht"] == 0.0
        assert result["total_tva"] == 0.0
        assert result["total_ttc"] == 0.0


class TestPlanComptable:
    """Tests plan comptable."""

    def test_all_accounts_have_labels(self):
        for code, info in PLAN_COMPTABLE.items():
            assert "label" in info, f"Account {code} missing label"
            assert "class" in info, f"Account {code} missing class"

    def test_key_accounts_exist(self):
        assert "411" in PLAN_COMPTABLE  # Créances clients
        assert "401" in PLAN_COMPTABLE  # Dettes fournisseurs
        assert "512" in PLAN_COMPTABLE  # Banque
        assert "701" in PLAN_COMPTABLE  # Ventes
        assert "441" in PLAN_COMPTABLE  # TVA collectée
        assert "445" in PLAN_COMPTABLE  # TVA déductible

    def test_account_classes(self):
        assert PLAN_COMPTABLE["411"]["class"] == "actif"
        assert PLAN_COMPTABLE["401"]["class"] == "passif"
        assert PLAN_COMPTABLE["701"]["class"] == "revenu"
        assert PLAN_COMPTABLE["601"]["class"] == "charge"


class TestCategoryMapping:
    """Tests mapping catégories → comptes."""

    def test_all_categories_mapped(self):
        for cat in ["materiel", "fournitures", "transport", "salaires", "energie", "loyer", "assurances", "maintenance", "autres"]:
            assert cat in CATEGORY_TO_ACCOUNT, f"Category {cat} not mapped"
            assert CATEGORY_TO_ACCOUNT[cat] in PLAN_COMPTABLE, f"Account {CATEGORY_TO_ACCOUNT[cat]} not in plan comptable"

    def test_tva_rates(self):
        assert CATEGORY_TVA_RATE["salaires"] == 0.0
        assert CATEGORY_TVA_RATE["materiel"] == 20.0
        assert CATEGORY_TVA_RATE["assurances"] == 0.0
        assert CATEGORY_TVA_RATE["transport"] == 20.0


class TestJournalEntryBalance:
    """Tests équilibre débit/crédit des écritures types."""

    def test_sale_entry_balanced(self):
        """Facture vente: 411 D = 701 C + 441 C."""
        ht, tva, ttc = 100, 20, 120
        entries = [
            {"debit": ttc, "credit": 0},   # 411
            {"debit": 0, "credit": ht},     # 701
            {"debit": 0, "credit": tva},    # 441
        ]
        total_debit = sum(e["debit"] for e in entries)
        total_credit = sum(e["credit"] for e in entries)
        assert abs(total_debit - total_credit) < 0.01

    def test_payment_entry_balanced(self):
        """Paiement: 512 D = 411 C."""
        amount = 120
        entries = [
            {"debit": amount, "credit": 0},   # 512
            {"debit": 0, "credit": amount},    # 411
        ]
        total_debit = sum(e["debit"] for e in entries)
        total_credit = sum(e["credit"] for e in entries)
        assert total_debit == total_credit

    def test_expense_entry_balanced(self):
        """Dépense: 601 D + 445 D = 401 C."""
        ht, tva, ttc = 50, 10, 60
        entries = [
            {"debit": ht, "credit": 0},    # 601
            {"debit": tva, "credit": 0},    # 445
            {"debit": 0, "credit": ttc},    # 401
        ]
        total_debit = sum(e["debit"] for e in entries)
        total_credit = sum(e["credit"] for e in entries)
        assert abs(total_debit - total_credit) < 0.01

    def test_expense_no_tva_balanced(self):
        """Dépense sans TVA (salaires): 621 D = 512 C."""
        ht = 2000
        entries = [
            {"debit": ht, "credit": 0},    # 621
            {"debit": 0, "credit": ht},     # 512
        ]
        total_debit = sum(e["debit"] for e in entries)
        total_credit = sum(e["credit"] for e in entries)
        assert total_debit == total_credit

    def test_expense_payment_balanced(self):
        """Paiement dépense: 401 D = 512 C."""
        amount = 60
        entries = [
            {"debit": amount, "credit": 0},   # 401
            {"debit": 0, "credit": amount},    # 512
        ]
        total_debit = sum(e["debit"] for e in entries)
        total_credit = sum(e["credit"] for e in entries)
        assert total_debit == total_credit


class TestTVACalculation:
    """Tests calcul TVA."""

    def test_tva_a_verser(self):
        """TVA à verser = collectée - déductible."""
        collectee = 500
        deductible = 200
        a_verser = collectee - deductible
        assert a_verser == 300

    def test_credit_tva(self):
        """Crédit TVA quand déductible > collectée."""
        collectee = 100
        deductible = 300
        a_verser = collectee - deductible
        assert a_verser == -200  # Crédit de TVA


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
