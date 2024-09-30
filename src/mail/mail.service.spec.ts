import { Test } from '@nestjs/testing';
import { MailService } from './mail.service';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import got from 'got';
import * as FormData from 'form-data';
import { EmailVar } from './mail.interfaces';

jest.mock('got');
jest.mock('form-data');

describe('MailService', () => {
  let service: MailService;

  const TEST_API_KEY = 'test-apiKey';
  const TEST_DOMAIN = 'tset-domain';
  const TEST_FROM_EMAIL = 'test-fromEmail';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            apiKey: TEST_API_KEY,
            domain: TEST_DOMAIN,
            fromEmail: TEST_FROM_EMAIL,
            isGlobal: true,
          },
        },
      ],
    }).compile();
    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should call sendEmail', async () => {
      const sendVerificationEmailArgs = {
        email: 'test@mail.com',
        code: 'test-code',
      };
      const sendEmailSpy = jest
        .spyOn(service as any, 'sendEmail')
        .mockImplementation(() => {
          return true;
        });
      service.sendVerificationEmail(
        sendVerificationEmailArgs.email,
        sendVerificationEmailArgs.code,
      );
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      expect(sendEmailSpy).toHaveBeenLastCalledWith(
        'Verfiy Your Email',
        sendVerificationEmailArgs.email,
        'verify-email',
        [
          { key: 'code', value: sendVerificationEmailArgs.code },
          { key: 'username', value: sendVerificationEmailArgs.email },
        ],
      );
    });
  });

  describe('sendEmail', () => {
    const sendEmailArgs: [string, string, string, EmailVar[]] = [
      'test-subject',
      'test-to-email',
      'test-template',
      [
        { key: 'code', value: 'test-code' },
        { key: 'username', value: 'test-to-email' },
      ],
    ];
    it('sends email', async () => {
      const ok = await service['sendEmail'](...sendEmailArgs);
      const formSpy = jest.spyOn(FormData.prototype, 'append');
      expect(formSpy).toHaveBeenCalled();
      expect(got.post).toHaveBeenCalledTimes(1);
      expect(got.post).toHaveBeenCalledWith(
        `https://api.mailgun.net/v3/${TEST_DOMAIN}/messages`,
        expect.any(Object),
      );
      expect(ok).toEqual(true);
    });

    it('fails on error', async () => {
      jest.spyOn(got, 'post').mockImplementation(() => {
        throw new Error();
      });
      const ok = await service['sendEmail'](...sendEmailArgs);
      expect(ok).toEqual(false);
    });
  });
});
