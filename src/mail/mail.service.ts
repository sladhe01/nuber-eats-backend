import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { EmailVar, MailModuleOptions } from './mail.interfaces';
import got from 'got';
import * as FormData from 'form-data';

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModuleOptions,
  ) {}

  private async sendEmail(
    subject: string,
    to: string,
    template: string,
    emailVars: EmailVar[],
  ): Promise<boolean> {
    const form = new FormData();
    form.append(
      'from',
      `Sladhe from NuberEats <mailgun@${this.options.domain}>`,
    );
    form.append('to', to);
    form.append('subject', subject);
    form.append('template', template);
    emailVars.forEach((eVar) => {
      form.append(`v:${eVar.key}`, eVar.value);
    });
    try {
      await got.post(
        `https://api.mailgun.net/v3/${this.options.domain}/messages`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${this.options.apiKey}`).toString('base64')}`,
          },
          body: form,
        },
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  sendVerificationEmail(email: string, code: string) {
    this.sendEmail('Verfiy Your Email', email, 'verify-email', [
      { key: 'code', value: code },
      { key: 'username', value: email },
    ]);
  }
}
