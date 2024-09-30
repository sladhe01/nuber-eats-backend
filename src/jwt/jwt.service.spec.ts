import { Test } from '@nestjs/testing';
import { JwtService } from './jwt.service';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import * as jwt from 'jsonwebtoken';
import { JwtModuleOptions } from './jwt.interfaces';

jest.mock('jsonwebtoken', () => {
  return {
    sign: jest.fn(() => MOCKED_TOKEN),
    verify: jest.fn(() => ({ id: USER_ID })),
  };
});

const TEST_KEY = 'testKey';
const USER_ID = 1;
const MOCKED_TOKEN = 'mockedToken';

describe('JwtService', () => {
  let service: JwtService;
  let options: JwtModuleOptions;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            isGlobal: true,
            privateKey: TEST_KEY,
          },
        },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
    options = module.get<JwtModuleOptions>(CONFIG_OPTIONS);
  });
  it('should be defined', async () => {
    expect(service).toBeDefined();
  });

  describe('sign', () => {
    it('should return signed token', async () => {
      const token = service.sign(USER_ID);
      expect(jwt.sign).toHaveBeenCalledTimes(1);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: USER_ID },
        options.privateKey,
        expect.any(Object),
      );
      expect(typeof token).toBe('string');
    });
  });
  describe('verfiy', () => {
    it('should return the decoded token', () => {
      const decodedToken = service.verify(MOCKED_TOKEN);
      expect(jwt.verify).toHaveBeenCalledTimes(1);
      expect(jwt.verify).toHaveBeenCalledWith(MOCKED_TOKEN, options.privateKey);
      expect(decodedToken).toMatchObject({ id: USER_ID });
    });
  });
});
