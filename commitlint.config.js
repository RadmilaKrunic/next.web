export default {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "requires-ptbass-ticket": ({ subject = "" }) => {
          const ok = /PTBASS-\d+/.test(subject);
          return [ok, "Commit subject must contain PTBASS-<number> (e.g. PTBASS-1234)."];
        },
      },
    },
  ],
  rules: {
    "requires-ptbass-ticket": [2, "always"],
    "subject-case": [0],
  },
};
