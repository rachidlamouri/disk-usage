const fs = require('fs');
const _ = require('lodash');
const chalk = require('chalk');
const inquirer = require('inquirer');

const topPath = '.';
const input = fs.readFileSync('usage.txt', 'utf8');

let allPaths;
_(input)
  .split('\n')
  .filter((line) => !/^\s*$/.test(line))
  .map((line) => {
    const match = line.match(/(\d*)\t(.*)/)
    const [, sizeText, originalFilepath] = match;
    const filepath = originalFilepath.startsWith('./') ? originalFilepath : (originalFilepath === '.' ? originalFilepath : `./${originalFilepath}`);
    const size = parseInt(sizeText, 10);
    return [
      filepath,
      {
        size,
        children: {},
        parentNode: null,
      },
    ]
  })
  .sortBy(([filepath]) => filepath)
  .tap((orderedInput) => {
    allPaths = _.fromPairs(orderedInput);
  })
  .forEach(([filepath, node], index, orderedInputs) => {
    const pathSegments = filepath.split('/');
    const lastSegment = pathSegments.pop();
    const parentPath = pathSegments.join('/');
    const parentNode = allPaths[parentPath];
    if (filepath !== topPath) {
      node.parentNode = parentNode;
      parentNode.children[lastSegment] = node;
    }
  })

const render = (node) => {
  const sortedChildren = _(node.children)
    .toPairs()
    .map(([filepath, childNode]) => {
      const kilobytes = Math.floor(childNode.size / 1000);
      const megabytes = Math.floor(kilobytes / 1000);
      const gigabytes = Math.floor(megabytes / 1000);

      return {
        filepath,
        node: childNode,
        kilobytes,
        megabytes,
        gigabytes,
      };
    })
    .sortBy(({ filepath }) => filepath)
    .value();

  const totalsLabel = 'Totals:';

  const maxLabelLength = _(sortedChildren)
    .map(({ filepath }) => filepath.length)
    .tap((list) => {
      list.push(totalsLabel.length);
      console.log(list)
    })
    .tap((list) => {
      console.log(list)
    })
    .max();

  const totalGb = _.sumBy(sortedChildren, (child) => child.gigabytes);
  const totalMb = _.sumBy(sortedChildren, (child) => child.megabytes);
  const totalKb = _.sumBy(sortedChildren, (child) => child.kilobytes);

  console.clear();
  sortedChildren.forEach((child, index) => {
    const {
      filepath,
      node: childNode,
      kilobytes,
      megabytes,
      gigabytes,
    } = child;

    const indexLabel = chalk.blue(_.padStart(`${index}`, `${sortedChildren.length}`.length));
    const filepathLabel = _.padEnd(filepath, maxLabelLength);

    const gigabytesLabel = `${_.padStart(gigabytes, 3)}G`;
    const megabytesLabel = `${_.padStart(megabytes, 6)}M`;
    const kilobytesLabel = `${_.padStart(kilobytes, 9)}K`;

    console.log(indexLabel, filepathLabel, gigabytesLabel, megabytesLabel, kilobytesLabel);
  })

  console.log();
  console.log(_.padStart('', `${sortedChildren.length}`.length), _.padEnd(totalsLabel, maxLabelLength), `${_.padStart(totalGb, 3)}G`, `${_.padStart(totalMb, 6)}M`, `${_.padStart(totalKb, 9)}K`);

  return inquirer.prompt([
    {
      type: 'input',
      message: 'goto',
      name: 'input',
    },
  ])
    .then(({ input }) => {
      if (input.match(/^[0-9]+$/)) {
        const index = parseInt(input, 10);
        if (index < sortedChildren.length) {
          render(sortedChildren[index].node);
          return
        }
      }

      if (node.parentNode !== null) {
        render(node.parentNode);
        return;
      }

      render(node);
    })
};

const topNode = allPaths[topPath];
const rootNode = {
  size: topNode.size,
  children: {
    [topPath]: topNode,
  },
  parentNode: null,
};
topNode.parentNode = rootNode;

render(rootNode)
  .catch((error) => {
    console.log(error);
    process.exit(1);
  })
