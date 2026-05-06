<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $userName,
        public readonly string $resetUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Reset your MoSPAMS password');
    }

    public function content(): Content
    {
        return new Content(htmlString: $this->buildHtml());
    }

    private function buildHtml(): string
    {
        $name = e($this->userName);
        $url  = e($this->resetUrl);

        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:Arial,sans-serif;background:#f4f4f5;margin:0;padding:32px;">
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e4e4e7;">
            <h2 style="margin:0 0 8px;font-size:22px;color:#18181b;">Reset your password</h2>
            <p style="color:#52525b;margin:0 0 24px;">Hi {$name}, we received a request to reset your MoSPAMS password.</p>
            <a href="{$url}" style="display:inline-block;padding:12px 28px;background:#18181b;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Reset Password</a>
            <p style="color:#a1a1aa;font-size:13px;margin:24px 0 0;">This link expires in <strong>15 minutes</strong>. If you did not request a password reset, you can ignore this email.</p>
            <hr style="border:none;border-top:1px solid #f4f4f5;margin:24px 0;">
            <p style="color:#d4d4d8;font-size:11px;margin:0;">MoSPAMS &mdash; Motorcycle Service &amp; Parts Management</p>
          </div>
        </body>
        </html>
        HTML;
    }
}
