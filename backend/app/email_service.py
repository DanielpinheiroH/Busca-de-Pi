import os
import smtplib
from email.message import EmailMessage


def send_email(to: str, subject: str, body: str):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM")

    print("\n===== AMAZON SES SMTP =====")
    print("SMTP_HOST:", smtp_host)
    print("SMTP_PORT:", smtp_port)
    print("SMTP_USER existe:", bool(smtp_user))
    print("SMTP_PASSWORD existe:", bool(smtp_password))
    print("SMTP_FROM:", smtp_from)
    print("===========================\n")

    if not smtp_host or not smtp_user or not smtp_password or not smtp_from:
        print("❌ Configuração SMTP incompleta.")
        return

    try:
        msg = EmailMessage()
        msg["From"] = smtp_from
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)

        with smtplib.SMTP(smtp_host, smtp_port) as smtp:
            smtp.starttls()
            smtp.login(smtp_user, smtp_password)
            smtp.send_message(msg)

        print(f"\n✅ E-MAIL ENVIADO VIA AMAZON SES para {to}\n")

    except Exception as error:
        print("\n❌ ERRO AMAZON SES")
        print(error)
        print()