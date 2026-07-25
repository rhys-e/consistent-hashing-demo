import { createMachine } from 'xstate';

export const executionStatusMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYgFUAFAEQEEAVAUQG0AGAXUVAAdDUCSXEAA9EANgDMAVgB0AFikTWADmWSJARikAmAOwAaEAE9EG7QF9zh1JlwDiMlBCxhSAZXq0ASvTackILz8RMRCoggaCjIAnLGx2pFyyrpSylKGJgg60TJi0dpicnLaKiqKltbo2Pghjs6uXoxu5ACyLBxCQSj2YaZRcfGJyanpxogSumIy0tESchrRrPkTYhUgNtX2MrDcOADuxCjEUKR+nXzdIb0RrLqsMlK6ykvRUhoS2lJyEhmI2kW5fJiR66ApJKRSNYbOy1ABOGGIh2OpHoAEkAMIAaTOAS6PQC4UeOTmEjET0+t1YrA0vwQEjUMWKZI0ukiK10UKqMJIMnhiKOJzRWOYGn8PAu+NA4Qk9JkykWIOUkS0yh+YwQemU8lYYm0n3y2gk0Tk0U5thqPL5SJOlG8QoAMowAPpUOhMajE8XBQQE8a3GSsTSGlnaNKqUaZDTKbTyRQaF7SCEJVZWdZci0OK0C0i28hudpiwISq6+iL9AYJIrDNK00P3OQ6vVSA1Gk1mza1ADGRk7LnRhDQ3BceFcnqL3tCpfjdweTxebw+XzVmXpWqKBSVELyiwsa2IhAgcCE0Iz5wn1wAtDT1caYnGtNE1MpiroOamT1snC4z5cfVLEHIBjqm8xIspIYgQWILKvu23IODs+zWj+koiKYGjArkrLPpIJp3Kw2i0tIEjyEychQZESzRnIsEZryCJIbixZ-qhdKqDIoaLBoCyRDoSjLuMujEs2cwLEshqTDRWzdr2YD9oOw5gMhJb-ggSoaOxJJLrE6EQoRkiMgUurRGSYjJLulhAA */
  id: 'executionStatus',
  initial: 'stopped',
  states: {
    stopped: {
      on: {
        START: 'running',
      },
    },
    running: {
      on: {
        PAUSE: 'paused',
        STOP: 'stopped',
      },
    },
    paused: {
      on: {
        RESUME: 'running',
        STOP: 'stopped',
      },
    },
  },
});
