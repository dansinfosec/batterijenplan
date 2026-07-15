from django.db import migrations

# Backfill van de korte SEO-titels die tot nu toe in de frontend leefden
# (POST_SEO_TITLES in src/seo.js en scripts/prerender-blog-meta.mjs). Alleen
# bestaande, nog lege seo_title-velden worden gevuld; handmatig ingevulde
# waarden blijven ongemoeid. De frontend-fallbackmaps blijven voorlopig staan.
SEO_TITLES = {
    "dynamisch-energiecontract-thuisbatterij": "Dynamisch contract + thuisbatterij | Batterijenplan",
    "elektrische-auto-ems-systeem": "EV slim laden met EMS | Batterijenplan",
    "ems-systeem-thuisbatterij-controle-over-stroom": "EMS voor thuisbatterijen | Batterijenplan",
    "enphase-vs-dyness": "Enphase vs Dyness | Batterijenplan",
    "groene-vrienden-vs-zonneplan-vs-tibber": "Groene Vrienden vs Zonneplan | Batterijenplan",
    "terugverdientijd-thuisbatterij-handel-of-zelfconsumptie": "Terugverdientijd thuisbatterij | Batterijenplan",
    "thuisbatterij-installatie": "Thuisbatterij installatie | Batterijenplan",
    "thuisbatterij-vergelijken": "Thuisbatterij vergelijken | Batterijenplan",
}


def fill_seo_titles(apps, schema_editor):
    Post = apps.get_model("blog", "Post")
    for slug, seo_title in SEO_TITLES.items():
        # Alleen vullen als het veld nog leeg is (niet-destructief, idempotent).
        Post.objects.filter(slug=slug, seo_title="").update(seo_title=seo_title)


def clear_seo_titles(apps, schema_editor):
    Post = apps.get_model("blog", "Post")
    for slug, seo_title in SEO_TITLES.items():
        # Alleen terugdraaien wat deze migratie zelf zette.
        Post.objects.filter(slug=slug, seo_title=seo_title).update(seo_title="")


class Migration(migrations.Migration):

    dependencies = [
        ("blog", "0003_post_cover_alt_post_seo_description_post_seo_title"),
    ]

    operations = [
        migrations.RunPython(fill_seo_titles, clear_seo_titles),
    ]
