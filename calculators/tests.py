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
        # Verbruik (10/dag) is laag t.o.v. overschot → geen extra marge.
        # Range: 20*0.9 = 18.0 en 20*1.15 = 23.0 → systeem 20 kWh.
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
        self.assertContains(response, "23.0")
        self.assertContains(response, "20 kWh systeem")

    def test_high_usage_low_export_stays_small(self):
        # Regressietest voor het 88 kWh-probleem: hoog verbruik mag de
        # batterij niet opblazen; teruglevering bepaalt de basis.
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
        self.assertContains(response, "15.0")
        self.assertContains(response, "19.2")
        self.assertContains(response, "20 kWh systeem")
        self.assertNotContains(response, "88 kWh systeem")
        self.assertNotContains(response, "63 kWh systeem")

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