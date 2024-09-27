export interface MailModuleOptions {
  apiKey: string;
  domain: string;
  fromEmail: string;
  isGlobal: boolean;
}

export interface EmailVar {
  key: string;
  value: string;
}
