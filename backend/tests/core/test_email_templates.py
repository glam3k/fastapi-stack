"""The email HTML render.

An email is not a sandbox: it is rendered by the recipient's mail client, with
no containment of its own. So the context values — the email address someone
typed into a password-recovery form, a display name — must be escaped before
they go into the HTML.
"""

from app.utils import render_email_template


def test_context_values_are_escaped() -> None:
    """Markup in a context value must not become markup in the email."""
    html = render_email_template(
        template_name="reset_password.html",
        context={
            "project_name": "FastAPI Project",
            "username": '<img src=x onerror="alert(1)">@example.com',
            "link": "https://example.com/reset?token=abc",
            "valid_hours": 48,
        },
    )
    assert "<img src=x" not in html
    assert "&lt;img" in html


def test_the_template_still_renders() -> None:
    """Escaping must not break the template."""
    html = render_email_template(
        template_name="reset_password.html",
        context={
            "project_name": "FastAPI Project",
            "username": "someone@example.com",
            "link": "https://example.com/reset?token=abc",
            "valid_hours": 48,
        },
    )
    assert "someone@example.com" in html
    assert "https://example.com/reset?token=abc" in html
