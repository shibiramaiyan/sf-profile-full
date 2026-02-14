// .mocharc.yml equivalent for ESM TypeScript project
module.exports = {
  require: ["ts-node/register"],
  extension: ["ts"],
  spec: "test/**/*.test.ts",
  timeout: 10000,
};
