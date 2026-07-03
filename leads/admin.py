from django.contrib import admin

from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "email", "postcode", "source", "consent", "created_at")
    list_filter = ("source", "consent", "created_at")
    search_fields = ("name", "phone", "email", "postcode", "message")
    readonly_fields = ("calculator_inputs", "calculator_result", "created_at")
    date_hierarchy = "created_at"
