from django.db import models


class Lead(models.Model):
    name = models.CharField("naam", max_length=120)
    phone = models.CharField("telefoon", max_length=40)
    email = models.EmailField("e-mail")
    postcode = models.CharField(max_length=10, blank=True)
    message = models.TextField("bericht", blank=True)

    calculator_inputs = models.JSONField(null=True, blank=True)
    calculator_result = models.JSONField(null=True, blank=True)

    source = models.CharField(max_length=50, default="react_calculator")
    consent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "lead"
        verbose_name_plural = "leads"

    def __str__(self):
        return f"{self.name} ({self.email})"
