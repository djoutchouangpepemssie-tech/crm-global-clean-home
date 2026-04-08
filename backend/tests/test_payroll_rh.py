"""
Tests unitaires — Module Paie & RH
"""
import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from payroll_rh import compute_payslip_amounts, compute_expense_totals


class TestComputePayslip:
    def test_basic_calculation(self):
        result = compute_payslip_amounts(3000)
        assert result["salary_brut"] == 3000
        assert result["social_charges"] == 1260.0  # 3000 * 0.42
        assert result["tax_estimation"] == 348.0   # (3000 - 1260) * 0.20
        assert result["salary_net"] == 1392.0      # 3000 - 1260 - 348

    def test_zero_salary(self):
        result = compute_payslip_amounts(0)
        assert result["salary_brut"] == 0
        assert result["social_charges"] == 0
        assert result["salary_net"] == 0

    def test_high_salary(self):
        result = compute_payslip_amounts(10000)
        assert result["salary_brut"] == 10000
        assert result["social_charges"] == 4200.0
        assert result["salary_net"] == 4640.0  # 10000 - 4200 - 1160

    def test_rounding(self):
        result = compute_payslip_amounts(2500.50)
        assert isinstance(result["salary_net"], float)
        # All values should be rounded to 2 decimals
        for key in ["salary_brut", "social_charges", "tax_estimation", "salary_net"]:
            assert result[key] == round(result[key], 2)


class TestComputeExpenseTotals:
    def test_single_item(self):
        items = [{"amount_ht": 100, "tva_rate": 20}]
        result = compute_expense_totals(items)
        assert result["total_ht"] == 100
        assert result["total_tva"] == 20
        assert result["total_ttc"] == 120

    def test_multiple_items(self):
        items = [
            {"amount_ht": 100, "tva_rate": 20},
            {"amount_ht": 50, "tva_rate": 10},
            {"amount_ht": 200, "tva_rate": 0},
        ]
        result = compute_expense_totals(items)
        assert result["total_ht"] == 350
        assert result["total_tva"] == 25  # 20 + 5 + 0
        assert result["total_ttc"] == 375

    def test_empty_items(self):
        result = compute_expense_totals([])
        assert result["total_ht"] == 0
        assert result["total_tva"] == 0
        assert result["total_ttc"] == 0

    def test_items_enriched(self):
        items = [{"amount_ht": 100, "tva_rate": 20, "description": "Test"}]
        result = compute_expense_totals(items)
        assert len(result["items"]) == 1
        assert result["items"][0]["amount_tva"] == 20
        assert result["items"][0]["amount_ttc"] == 120
        assert result["items"][0]["description"] == "Test"

    def test_default_tva_rate(self):
        items = [{"amount_ht": 100}]
        result = compute_expense_totals(items)
        # default tva_rate is 20
        assert result["total_tva"] == 20


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
