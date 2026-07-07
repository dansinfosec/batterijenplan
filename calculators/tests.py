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

    def test_sunny_day_question_ignored_without_trigger(self):
        # Verbruik is niet >= 2x teruglevering -> geen trigger, sunny_day_export
        # (ook al aanwezig) mag de uitkomst niet beïnvloeden.
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "residential",
                "goal": "trading",
                "yearly_usage": "8000",
                "exported_energy": "5000",
                "sunny_day_export": "over_50",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "verhoogd op basis van")

    def test_sunny_day_export_unknown_keeps_existing_calculation(self):
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "residential",
                "goal": "trading",
                "yearly_usage": "20000",
                "exported_energy": "4000",
                "sunny_day_export": "unknown",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "18.7")
        self.assertContains(response, "22.9")
        self.assertNotContains(response, "verhoogd op basis van")

    def test_sunny_day_export_overrides_low_recommendation_trading(self):
        # 20000 verbruik / 4000 teruglevering triggert de vraag (>= 2x).
        # Basis 16, handel-advies 20.8. Antwoord "40-50 kWh" -> 45 kWh:
        # handel houdt de 30%-marge -> 45 * 1.3 = 58.5 -> range 52.6-64.4, T63.
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "residential",
                "goal": "trading",
                "yearly_usage": "20000",
                "exported_energy": "4000",
                "sunny_day_export": "40_50",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "52.6")
        self.assertContains(response, "64.4")
        self.assertContains(response, "Dyness S3 Tower T63")
        self.assertContains(response, "verhoogd op basis van")

    def test_sunny_day_export_overrides_low_recommendation_self_consumption(self):
        # De correctie geldt ook voor zelfconsumptie: basis 16, advies 16.
        # Antwoord "40-50 kWh" -> 45 kWh > 16 -> advies = 45.
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "residential",
                "goal": "self_consumption",
                "yearly_usage": "20000",
                "exported_energy": "4000",
                "sunny_day_export": "40_50",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "40.5")
        self.assertContains(response, "49.5")
        self.assertContains(response, "Dyness S3 Tower T42")
        self.assertContains(response, "verhoogd op basis van")

    def test_sunny_day_export_below_average_keeps_calculation(self):
        # Antwoord lager dan of gelijk aan het jaargemiddelde per zonnige dag
        # (basis 4000/250 = 16; "10-20 kWh" -> 15 <= 16): niets veranderen.
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "residential",
                "goal": "trading",
                "yearly_usage": "20000",
                "exported_energy": "4000",
                "sunny_day_export": "10_20",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "18.7")
        self.assertContains(response, "22.9")
        self.assertNotContains(response, "verhoogd op basis van")

    def test_sunny_day_export_over_50_maps_to_60_self_consumption(self):
        # "Meer dan 50 kWh" -> 60 kWh. Zelfconsumptie: advies minimaal 60
        # -> range 54.0-66.0, T63.
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "residential",
                "goal": "self_consumption",
                "yearly_usage": "20000",
                "exported_energy": "2000",
                "sunny_day_export": "over_50",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "54.0")
        self.assertContains(response, "66.0")
        self.assertContains(response, "Dyness S3 Tower T63")
        self.assertContains(response, "verhoogd op basis van")

    def test_sunny_day_export_over_50_maps_to_60_trading(self):
        # "Meer dan 50 kWh" -> 60 kWh. Handel houdt de 30%-marge:
        # 60 * 1.3 = 78 -> advies minimaal 78 -> range 70.2-85.8, T85.
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "residential",
                "goal": "trading",
                "yearly_usage": "20000",
                "exported_energy": "2000",
                "sunny_day_export": "over_50",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "70.2")
        self.assertContains(response, "85.8")
        self.assertContains(response, "Dyness S3 Tower T85")
        self.assertContains(response, "verhoogd op basis van")

    def test_sunny_day_export_business_options_override_trading(self):
        # Zakelijke bandbreedtes gaan veel hoger (tot 640+ kWh). 200000
        # verbruik / 20000 teruglevering triggert de vraag; "400-640 kWh"
        # -> 520 kWh, handel houdt de 30%-marge: 520 * 1.3 = 676
        # -> range 608.4-743.6, BOLT-645kWh 3x Cabinet.
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "business",
                "goal": "trading",
                "yearly_usage": "200000",
                "exported_energy": "20000",
                "sunny_day_export": "400_640",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "608.4")
        self.assertContains(response, "743.6")
        self.assertContains(response, "BOLT-645kWh 3x Cabinet")
        self.assertContains(response, "verhoogd op basis van")

    def test_sunny_day_export_business_over_640_maps_to_640_self_consumption(self):
        # "Meer dan 640 kWh" -> 640 kWh. Zelfconsumptie: advies minimaal 640
        # -> range 576.0-704.0, BOLT-645kWh 3x Cabinet.
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "business",
                "goal": "self_consumption",
                "yearly_usage": "200000",
                "exported_energy": "20000",
                "sunny_day_export": "over_640",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "576.0")
        self.assertContains(response, "704.0")
        self.assertContains(response, "BOLT-645kWh 3x Cabinet")
        self.assertContains(response, "verhoogd op basis van")

    def test_sunny_day_export_business_below_average_keeps_calculation(self):
        # "Minder dan 50 kWh" -> 25 kWh, ruim onder het jaargemiddelde
        # (basis 20000/250 = 80): berekening blijft ongewijzigd.
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "business",
                "goal": "trading",
                "yearly_usage": "200000",
                "exported_energy": "20000",
                "sunny_day_export": "under_50",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "93.6")
        self.assertContains(response, "114.4")
        self.assertNotContains(response, "verhoogd op basis van")

    def test_sunny_day_export_business_unknown_keeps_existing_calculation(self):
        response = self.client.post(
            reverse("thuisbatterij_calculator"),
            {
                "customer_type": "business",
                "goal": "trading",
                "yearly_usage": "200000",
                "exported_energy": "20000",
                "sunny_day_export": "unknown",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "93.6")
        self.assertContains(response, "114.4")
        self.assertNotContains(response, "verhoogd op basis van")