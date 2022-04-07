import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="Magic Pad",
    version="0.0.1",
    author="Matt Woolford",
    author_email="matt@mattwoolford.co.uk",
    description="Magic Pad is a tool designed for use in a restaurant environment that can help eradicate "
                "bottlenecks, reduce common service errors and substitute pen and paper with a more informative "
                "alternative.",
    license="Proprietary",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: Other/Proprietary License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.9.9',
)