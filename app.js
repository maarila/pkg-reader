/**
 * @fileoverview A web server that presents the user a list of the software
 *    packages on user's Debian/Ubuntu system listed at /var/lib/dpkg/status.
 *    Parsed information includes name, description, dependencies and reverse
 *    dependencies.
 */
const http = require('http');
const fs = require('fs');
const querystring = require('querystring');

const hostname = '127.0.0.1';
const port = 8080;

const source = './var/lib/dpkg/status';
const htmlIndex = './index.html';
const cssDefinitions = './app.css';

/** get chars after 'Package:' ignoring spaces and tabs before and after */
const packageNameParser = /^Package:[ |\t]*(.+)[ |\t]*$/;

/** get chars after 'Description' ignoring spaces and tabs before and after */
const descriptionSummaryParser = /^Description:[ |\t]*(.+)[ |\t]*$/;

/** get chars after 'Depends' ignoring spaces and tabs before and after */
const dependencyParser = /^Depends:[ |\t]*(.+)[ |\t]*$/;

/** match if begins with one or more space and/or tab */
const startsWithWhitespaceParser = /^[ |\t]+/;

/** match and get when begins with a space and is enclosed in parentheses */
const versionParser = / \(.*?\)/g;

/** match all commas */
const commasParser = /,/g;

/**
 * Finds the names of the packages. Regex ignores horizontal white space before
 *    and after the value as per the definitions in Chapter 5.1 Syntax of
 *    control files in the Debian Policy Manual
 * @return {Array<string>} List of package names
 */
const getPackageNames = () => {
  const names = [];

  const fileToProcess = getFile(source);
  const lines = splitIntoLines(fileToProcess);

  lines.forEach(line => {
    const match = line.match(packageNameParser);
    if (match) names.push(match[1]);
  });

  return names;
};

/**
 * Finds detailed information for a package. Information includes a description
 *    summary, a more detailed description, dependencies for the package and
 *    names of packages that depend on this package
 * @param {string} packageName Name of package for which to find information
 * @return {Object} Details of the package
 */
const getInfoFor = packageName => {
  let summary = '';
  let description = '';
  let dependenciesTemp = '';
  const dependents = [];

  const allPackageNames = [];
  const allPackages = getAsParagraphs(source);

  for (const package of allPackages) {
    const lines = splitIntoLines(package);

    const currentName = getNameFrom(lines);
    allPackageNames.push(currentName);

    const isCorrectPackage = currentName === packageName;

    if (!isCorrectPackage && isDependentOn(packageName, lines)) {
      dependents.push(currentName);
      continue;
    } else if (!isCorrectPackage) {
      continue;
    } else {
      summary = getSummaryFrom(lines);
      description = getDescriptionFrom(lines);
      dependenciesTemp = getDependenciesFrom(lines);
    }
  }

  const dependencies = findDependenciesFor(dependenciesTemp, allPackageNames);

  return {
    summary: summary,
    description: description,
    depends: dependencies,
    dependents: dependents
  };
};

/**
 * Reads and returns a utf-8 formatted text file from the given path
 * @param {string} file Path to file
 * @return {string} Contents of file
 */
const getFile = file => {
  return fs.readFileSync(file, 'utf8');
};

/**
 * Match a dependency to a dependency list in package information
 * @param {string} nameToFind String to match
 * @param {Array<string>} packageInfo Package information paragraph
 * @return {boolean} Match found or not
 */
const isDependentOn = (nameToFind, packageInfo) => {
  const dependencies = getDependenciesFrom(packageInfo);
  return dependencies.split(' ').includes(nameToFind);
};

/**
 * Locate a name from package information
 * @param {Array<string>} packageInfo Package information paragraph
 * @return {<string>} Package name
 */
const getNameFrom = packageInfo => {
  for (const line of packageInfo) {
    const nameMatch = line.match(packageNameParser);
    if (nameMatch) return nameMatch[1];
  }
};

/**
 * Locate a description summary from package information
 * @param {Array<string>} packageInfo Package information paragraph
 * @return {<string>} Package description summary
 */
const getSummaryFrom = packageInfo => {
  for (const line of packageInfo) {
    const descriptionMatch = line.match(descriptionSummaryParser);
    if (descriptionMatch) return descriptionMatch[1];
  }
};

/**
 * Locate a description from package information
 * @param {Array<string>} packageInfo Package information paragraph
 * @return {<string>} Package description
 */
const getDescriptionFrom = packageInfo => {
  const description = [];
  let saveDescription = false;

  for (const line of packageInfo) {
    if (line.match(startsWithWhitespaceParser) && saveDescription) {
      description.push(line);
      continue;
    } else {
      saveDescription = false;
    }

    const descriptionMatch = line.match(descriptionSummaryParser);
    if (descriptionMatch) saveDescription = true;
  }

  return joinDescriptionLines(description);
};

/**
 * Locate dependencies from package information
 * @param {Array<string>} packageInfo Package information paragraph
 * @return {<string>} Package dependencies
 */
const getDependenciesFrom = packageInfo => {
  for (const line of packageInfo) {
    const dependencyMatch = line.match(dependencyParser);
    if (dependencyMatch) {
      const dependencies = dependencyMatch[1];
      return parseDependencyString(dependencies);
    }
  }
  return '';
};

/**
 * Finds out whether given dependencies are found among given package name list
 * @param {<string>} dependenciesAsString Dependency information in single line
 * @param {Array<string>} packageInfo List of packages to match
 * @return {<Object>} Dependency name and whether it found a match or not
 */
const findDependenciesFor = (dependenciesAsString, allPackageNames) => {
  const dependencyObjects = [];

  if (dependenciesAsString) {
    const dependencyList = dependenciesAsString.split(' ');
    const uniqueDependencies = [...new Set(dependencyList)];
    uniqueDependencies.forEach(dependency => {
      dependencyObjects.push({
        name: dependency,
        found: allPackageNames.includes(dependency) ? true : false
      });
    });
  }
  return dependencyObjects;
};

/**
 * Remove version information from a dependency line
 * @param {<string>} dependencies Dependencies in a single line
 * @return {<string>} Dependencies without version info separated by spaces
 */
const parseDependencyString = dependencies => {
  const packageNamesOnly = dependencies
    .replace(versionParser, '')
    .replace(commasParser, '');
  return packageNamesOnly;
};

/**
 * Splits textual data into paragraphs separated by empty lines
 * @param {string} textData Text to separate
 * @return {Array<string>} List of paragraphs
 */
const splitIntoParagraphs = textData => {
  return textData.split('\n\n');
};

/**
 * Splits textual data into lines separated by line breaks
 * @param {string} textData Text to separate
 * @return {Array<string>} List of lines
 */
const splitIntoLines = textData => {
  return textData.split('\n');
};

/**
 * Retrieves textual data from given path and returns it split into paragraphs
 *    separated by empty lines
 * @param {string} file Path to file
 * @return {Array<string>} List of paragraphs
 */
const getAsParagraphs = file => {
  return splitIntoParagraphs(getFile(file));
};

/**
 * Retrieves textual data from given path and returns it split into paragraphs
 *    separated by empty lines
 * @param {Array<string>} description Text data in an array
 * @return {string} Contents of array as a single string
 */
const joinDescriptionLines = description => {
  return description.join('').trim();
};

/**
 * Web server definition. Server listens to four paths and answers accordingly.
 * with a payload or not. Responses are separated into successes and failures
 * as illustrated by the status codes
 */
const server = http.createServer((req, res) => {
  const url = new URL('http://' + hostname + ':' + port + req.url);
  const path = url.pathname;

  if (url.search.includes('+')) {
    url.search = url.search.replace(/\+/g, '%2B');
  }

  if (req.method === 'GET') {
    switch (path) {
      case '/':
        responseSuccess(res, 'text/html', getFile(htmlIndex));
        break;
      case '/app.css':
        responseSuccess(res, 'text/css', getFile(cssDefinitions));
        break;
      case '/names':
        const nameData = { names: getPackageNames() };
        responseSuccess(res, 'application/json', JSON.stringify(nameData));
        break;
      case '/packages':
        const package = url.searchParams.get('name');
        if (package) {
          const details = getInfoFor(package);
          responseSuccess(res, 'application/json', JSON.stringify(details));
          break;
        }
      default:
        responseFailure(res);
    }
  }
});

const responseSuccess = (res, header, data) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', header);
  res.end(data);
};

const responseFailure = res => {
  res.statusCode = 404;
  res.end();
};

/** The program starts here */
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
