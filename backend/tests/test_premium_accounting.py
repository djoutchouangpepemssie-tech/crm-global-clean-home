"""
Tests unitaires - Module PREMIUM Comptabilité + Stocks + Devis/Factures
Tests des calculs critiques : TVA, remises, totaux, mouvements stock
"""
import pytest
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from accounting import (
    calculate_line_total,
    calculate_document_totals,
    generate_reference,
    TVA_RATES,
)


# ═══════════════════════════════════════════════════════════════════
# TESTS CALCULS TVA
# ═══════════════════════════════════════════════════════════════════

class TestTVACalculations:
    def test_tva_exonere(self):
        """Micro-entreprise : TVA = 0."""
        result = calculate_line_total(1, 100, 0, "exonere")
        assert result["tva_percent"] == 0.0
        assert result["tva_amount"] == 0.0
        assert result["amount_ht"] == 100.0
        assert result["amount_ttc"] == 100.0

    def test_tva_standard_20(self):
        """TVA standard 20%."""
        result = calculate_line_total(1, 100, 0, "standard")
        assert result["tva_percent"] == 20.0
        assert result["tva_amount"] == 20.0
        assert result["amount_ht"] == 100.0
        assert result["amount_ttc"] == 120.0

    def test_tva_intermediaire_10(self):
        """TVA intermédiaire 10%."""
        result = calculate_line_total(1, 200, 0, "intermediaire")
        assert result["tva_percent"] == 10.0
        assert result["tva_amount"] == 20.0
        assert result["amount_ttc"] == 220.0

    def test_tva_reduit_5_5(self):
        """TVA réduit 5.5%."""
        result = calculate_line_total(1, 1000, 0, "reduit")
        assert result["tva_percent"] == 5.5
        assert result["tva_amount"] == 55.0
        assert result["amount_ttc"] == 1055.0

    def test_tva_super_reduit(self):
        """TVA super réduit 2.1%."""
        result = calculate_line_total(1, 100, 0, "super_reduit")
        assert result["tva_percent"] == 2.1
        assert result["tva_amount"] == 2.1
        assert result["amount_ttc"] == 102.1

    def test_tva_rate_unknown_defaults_zero(self):
        """Taux inconnu → 0%."""
        result = calculate_line_total(1, 100, 0, "inconnu")
        assert result["tva_percent"] == 0.0
        assert result["tva_amount"] == 0.0


# ═══════════════════════════════════════════════════════════════════
# TESTS CALCULS LIGNES
# ═══════════════════════════════════════════════════════════════════

class TestLineCalculations:
    def test_simple_line(self):
        """Ligne simple : 2 x 50€."""
        result = calculate_line_total(2, 50, 0, "exonere")
        assert result["subtotal"] == 100.0
        assert result["discount_amount"] == 0.0
        assert result["amount_ht"] == 100.0
        assert result["amount_ttc"] == 100.0

    def test_line_with_discount(self):
        """Ligne avec remise 10%."""
        result = calculate_line_total(1, 100, 10, "exonere")
        assert result["subtotal"] == 100.0
        assert result["discount_amount"] == 10.0
        assert result["amount_ht"] == 90.0
        assert result["amount_ttc"] == 90.0

    def test_line_with_discount_and_tva(self):
        """Remise 15% + TVA 20%."""
        result = calculate_line_total(2, 100, 15, "standard")
        assert result["subtotal"] == 200.0
        assert result["discount_amount"] == 30.0
        assert result["amount_ht"] == 170.0
        assert result["tva_amount"] == 34.0  # 170 * 20%
        assert result["amount_ttc"] == 204.0

    def test_line_zero_quantity(self):
        """Quantité 0 → tout à 0."""
        result = calculate_line_total(0, 100, 0, "standard")
        assert result["subtotal"] == 0.0
        assert result["amount_ttc"] == 0.0

    def test_line_decimal_quantity(self):
        """Quantité décimale (heures, m²)."""
        result = calculate_line_total(2.5, 40, 0, "exonere")
        assert result["subtotal"] == 100.0
        assert result["amount_ht"] == 100.0

    def test_100_percent_discount(self):
        """Remise 100% = gratuit."""
        result = calculate_line_total(1, 500, 100, "standard")
        assert result["amount_ht"] == 0.0
        assert result["tva_amount"] == 0.0
        assert result["amount_ttc"] == 0.0

    def test_negative_quantity_raises(self):
        """Quantité négative → erreur."""
        with pytest.raises(ValueError, match="négative"):
            calculate_line_total(-1, 100, 0, "exonere")

    def test_negative_price_raises(self):
        """Prix négatif → erreur."""
        with pytest.raises(ValueError, match="négatif"):
            calculate_line_total(1, -100, 0, "exonere")

    def test_discount_over_100_raises(self):
        """Remise > 100% → erreur."""
        with pytest.raises(ValueError, match="entre 0 et 100"):
            calculate_line_total(1, 100, 150, "exonere")

    def test_negative_discount_raises(self):
        """Remise négative → erreur."""
        with pytest.raises(ValueError, match="entre 0 et 100"):
            calculate_line_total(1, 100, -5, "exonere")

    def test_rounding_precision(self):
        """Vérifier l'arrondi à 2 décimales."""
        result = calculate_line_total(3, 33.33, 0, "standard")
        assert result["subtotal"] == 99.99
        assert result["tva_amount"] == 20.0  # 99.99 * 0.2 = 19.998 → 20.0
        assert result["amount_ttc"] == 119.99


# ═══════════════════════════════════════════════════════════════════
# TESTS TOTAUX DOCUMENT
# ═══════════════════════════════════════════════════════════════════

class TestDocumentTotals:
    def test_single_line_document(self):
        """Document avec une seule ligne."""
        lines = [{"quantity": 1, "unit_price": 100, "discount_percent": 0, "tva_rate": "exonere"}]
        totals = calculate_document_totals(lines)
        assert totals["total_ht"] == 100.0
        assert totals["total_tva"] == 0.0
        assert totals["total_ttc"] == 100.0

    def test_multi_line_document(self):
        """Document avec plusieurs lignes."""
        lines = [
            {"quantity": 2, "unit_price": 50, "discount_percent": 0, "tva_rate": "exonere"},
            {"quantity": 1, "unit_price": 200, "discount_percent": 10, "tva_rate": "exonere"},
            {"quantity": 3, "unit_price": 30, "discount_percent": 0, "tva_rate": "standard"},
        ]
        totals = calculate_document_totals(lines)
        # Line 1: 100 HT
        # Line 2: 200 - 20 = 180 HT
        # Line 3: 90 HT + 18 TVA = 108 TTC
        assert totals["total_ht"] == 370.0
        assert totals["total_tva"] == 18.0
        assert totals["total_ttc"] == 388.0
        assert totals["total_discount"] == 20.0

    def test_empty_lines(self):
        """Pas de lignes → tout à 0."""
        totals = calculate_document_totals([])
        assert totals["total_ht"] == 0
        assert totals["total_ttc"] == 0

    def test_mixed_tva_rates(self):
        """Mix de taux TVA différents."""
        lines = [
            {"quantity": 1, "unit_price": 100, "discount_percent": 0, "tva_rate": "standard"},
            {"quantity": 1, "unit_price": 100, "discount_percent": 0, "tva_rate": "reduit"},
        ]
        totals = calculate_document_totals(lines)
        assert totals["total_ht"] == 200.0
        assert totals["total_tva"] == 25.5  # 20 + 5.5
        assert totals["total_ttc"] == 225.5

    def test_all_discounted(self):
        """Toutes les lignes avec remises."""
        lines = [
            {"quantity": 1, "unit_price": 100, "discount_percent": 50, "tva_rate": "exonere"},
            {"quantity": 1, "unit_price": 200, "discount_percent": 25, "tva_rate": "exonere"},
        ]
        totals = calculate_document_totals(lines)
        # Line 1: 50 HT, Line 2: 150 HT
        assert totals["total_ht"] == 200.0
        assert totals["total_discount"] == 100.0


# ═══════════════════════════════════════════════════════════════════
# TESTS REFERENCE GENERATION
# ═══════════════════════════════════════════════════════════════════

class TestReferenceGeneration:
    def test_generate_dev_reference(self):
        """Référence devis format correct."""
        ref = generate_reference("DEV", 1)
        assert ref.startswith("GCH-DEV-")
        assert ref.endswith("-0001")

    def test_generate_fac_reference(self):
        """Référence facture format correct."""
        ref = generate_reference("FAC", 42)
        assert ref.startswith("GCH-FAC-")
        assert ref.endswith("-0042")

    def test_counter_padding(self):
        """Compteur paddé à 4 chiffres."""
        ref = generate_reference("DEV", 999)
        assert "-0999" in ref
        ref2 = generate_reference("DEV", 10000)
        assert "-10000" in ref2


# ═══════════════════════════════════════════════════════════════════
# TESTS SCENARIOS METIER COMPLETS
# ═══════════════════════════════════════════════════════════════════

class TestBusinessScenarios:
    def test_menage_domicile_basic(self):
        """Scénario ménage domicile standard."""
        lines = [
            {"quantity": 3, "unit_price": 35, "discount_percent": 0, "tva_rate": "exonere"},  # 3h
        ]
        totals = calculate_document_totals(lines)
        assert totals["total_ttc"] == 105.0

    def test_nettoyage_bureaux_with_products(self):
        """Nettoyage bureaux avec produits et TVA."""
        lines = [
            {"quantity": 5, "unit_price": 45, "discount_percent": 0, "tva_rate": "standard"},  # Main d'oeuvre
            {"quantity": 2, "unit_price": 15, "discount_percent": 0, "tva_rate": "standard"},  # Produits
        ]
        totals = calculate_document_totals(lines)
        # 225 + 30 = 255 HT, TVA 51 → 306 TTC
        assert totals["total_ht"] == 255.0
        assert totals["total_tva"] == 51.0
        assert totals["total_ttc"] == 306.0

    def test_devis_with_global_discount(self):
        """Devis avec remise globale de fidélité."""
        lines = [
            {"quantity": 1, "unit_price": 200, "discount_percent": 0, "tva_rate": "exonere"},
        ]
        totals = calculate_document_totals(lines)
        # Appliquer 10% global
        global_discount = round(totals["total_ht"] * 10 / 100, 2)
        final_ht = round(totals["total_ht"] - global_discount, 2)
        assert final_ht == 180.0
        assert global_discount == 20.0

    def test_large_invoice_precision(self):
        """Facture importante : pas de perte de précision."""
        lines = [
            {"quantity": 100, "unit_price": 99.99, "discount_percent": 5, "tva_rate": "standard"},
        ]
        totals = calculate_document_totals(lines)
        # 100 * 99.99 = 9999 - 5% = 9499.05 HT
        assert totals["total_ht"] == 9499.05
        assert totals["total_tva"] == 1899.81  # 9499.05 * 0.2
        assert totals["total_ttc"] == 11398.86


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
