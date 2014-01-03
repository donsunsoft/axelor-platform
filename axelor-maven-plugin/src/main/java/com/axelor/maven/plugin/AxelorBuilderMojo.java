/**
 * Copyright (c) 2012-2014 Axelor. All Rights Reserved.
 *
 * The contents of this file are subject to the Common Public
 * Attribution License Version 1.0 (the “License”); you may not use
 * this file except in compliance with the License. You may obtain a
 * copy of the License at:
 *
 * http://license.axelor.com/.
 *
 * The License is based on the Mozilla Public License Version 1.1 but
 * Sections 14 and 15 have been added to cover use of software over a
 * computer network and provide for limited attribution for the
 * Original Developer. In addition, Exhibit A has been modified to be
 * consistent with Exhibit B.
 *
 * Software distributed under the License is distributed on an “AS IS”
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 *
 * The Original Code is part of "Axelor Business Suite", developed by
 * Axelor exclusively.
 *
 * The Original Developer is the Initial Developer. The Initial Developer of
 * the Original Code is Axelor.
 *
 * All portions of the code written by Axelor are
 * Copyright (c) 2012-2014 Axelor. All Rights Reserved.
 */
package com.axelor.maven.plugin;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

import org.apache.maven.model.Dependency;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.project.MavenProject;

import com.axelor.tools.x2j.Extender;
import com.axelor.tools.x2j.Generator;
import com.axelor.tools.x2j.Log;
import com.axelor.tools.x2j.Log.Type;
import com.google.common.base.Charsets;
import com.google.common.base.Joiner;
import com.google.common.collect.Lists;
import com.google.common.io.Files;

/**
 * Axelor project builder goals.
 *
 * @goal generate
 * @phase generate-sources
 * @author Amit Mendapara <amit@axelor.com>
 */
public class AxelorBuilderMojo extends AbstractMojo {

	/**
     * @parameter expression="${project}"
     * @required
     * @readonly
     * @since 1.0
     */
    private MavenProject project;

	/**
	 * Location of the XML description files
	 *
	 * @parameter expression="${basedir}"
	 * @required
	 */
	private File baseDirectory;

	/**
	 * Location of the build target
	 *
	 * @parameter expression="${project.build.directory}"
	 * @required
	 */
	private File targetDirectory;

	@Override
	public void execute() throws MojoExecutionException {
		try {
			genInfo();
		} catch (Exception e) {
		}
		try {
			genCode();
		} catch (IOException e) {
		}
	}

	private void genCode() throws IOException {

		String searchPath = baseDirectory.getPath() + "/src/main/resources/domains";

		File path = null;
		Generator gen = null;

		path = new File(searchPath);
		if (path.exists()) {
			gen = new Generator(baseDirectory, targetDirectory);
			generate(gen);
			return;
		}

		path = new File(baseDirectory.getPath(), "/axelor-objects");
		if (path.exists()) {
			gen = new Extender(baseDirectory, targetDirectory);
			generate(gen);
		}
	}

	private void generate(Generator gen) throws IOException {

		String outputPath = targetDirectory.getPath() + "/src-gen";

		getLog().info("Generating Models: " + baseDirectory);

		gen.getLog().addListener(new Log.Listener() {

			boolean show = "info".equals(System.getProperty("x2j.log"));

			@Override
			public void onLog(Type type, String message, Throwable error) {
				if (type == Type.INFO && show) {
					getLog().info(message);
				} else if (type == Type.ERROR) {
					getLog().error(message, error);
				} else if (type == Type.DEBUG) {
					getLog().debug(message, error);
				}
			}
		});

		gen.start();

		getLog().info(String.format("Source directory: %s added.", outputPath));

		File target = new File(outputPath);
		this.project.addCompileSourceRoot(target.getAbsolutePath());
	}

	private void genInfo() throws FileNotFoundException {

		String searchPath = baseDirectory.getPath() + "/src/main/resources/module.properties";
		String outputPath = targetDirectory.getPath() + "/src-gen/module.properties";

		File search = new File(searchPath);
		if (search.exists()) {
			return;
		}

		File output = new File(outputPath);
		if (output.exists()) {
			return;
		}

		try {
			Files.createParentDirs(output);
		} catch (IOException e) {
			getLog().info("Error generating module.properties", e);
			return;
		}

		getLog().info("Generating: " + outputPath);

		BufferedWriter writer = Files.newWriter(output, Charsets.UTF_8);
		PrintWriter printer = new PrintWriter(writer);

		String description = project.getDescription();
		if (project.getParent() != null && description.equals(project.getParent().getDescription())) {
			description = "";
		}

		description = description.replace("\n", "\\\n");

		printer.println("name = " + project.getArtifactId());
		printer.println("version = " + project.getVersion());
		printer.println();
		printer.println("title = " + project.getName());
		printer.println("description = " + description);

		List<String> deps = Lists.newArrayList();
		for (Object d : project.getDependencies()) {
			Dependency dependency = (Dependency) d;
			if (dependency.getGroupId().startsWith("com.axelor") && !"test".equals(dependency.getScope())) {
				deps.add("\t" + dependency.getArtifactId());
			}
		}

		printer.println();

		if (deps.size() > 0) {
			printer.println("depends = \\");
			printer.println(Joiner.on(" \\\n").join(deps));
		}

		printer.close();
	}
}
