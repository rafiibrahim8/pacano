import child_process from 'child_process';

const assertBsdtar = () => {
    try {
        child_process.execSync('bsdtar --version');
    } catch (err) {
        console.log('Command bsdtar not found. Please install bsdtar.');
        process.exit(1);
    }
};

export { assertBsdtar };
