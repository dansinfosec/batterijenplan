from django.test import TestCase
from django.urls import reverse


class ThuisbatterijCalculatorTests(TestCase):

    def test_calculator_page_loads(self):
        response = self.client.get(
            reverse("thuisbatterij_calculator")
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Thuisbatterij Calculator")

    def test_self_consumption_calculation(self):
        # Basis = teruglevering / 250 zonnige dagen: 5000/250 = 20 kWh.
        # Zelfconsumptie: advies = basis → range 18.0–22.0.
        # Dichtstbijzijnde systeem: Dyness S3 Tower T21 (21,3 kWh).
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "residential",
                "goal": "self_consumption",
                "yearly_usage": "3650",
                "exported_energy": "5000",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "18.0")
        self.assertContains(response, "22.0")
        self.assertContains(response, "Dyness S3 Tower T21")
        self.assertContains(response, "21,3 kWh")

    def test_high_usage_low_export_stays_small(self):
        # Regressietest voor het 88 kWh-probleem: hoog verbruik mag de
        # batterij niet opblazen; teruglevering bepaalt de basis.
        # Basis 2920/250 = 11,68 → handel ×1,3 = 15,18 → range 13.7–16.7.
        # Dichtstbijzijnde systeem: T14 (14,2 kWh).
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "residential",
                "goal": "trading",
                "yearly_usage": "16000",
                "exported_energy": "2920",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "13.7")
        self.assertContains(response, "16.7")
        self.assertContains(response, "Dyness S3 Tower T14")
        self.assertNotContains(response, "T88")
        self.assertNotContains(response, "T106")

    def test_negative_exported_energy_shows_error(self):
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "residential",
                "goal": "self_consumption",
                "yearly_usage": "3500",
                "exported_energy": "-100",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Teruglevering kan niet negatief zijn.")