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
package com.axelor.tools.x2j;

import groovy.text.GStringTemplateEngine;
import groovy.text.Template;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.Map;

import org.codehaus.groovy.control.CompilationFailedException;

import com.axelor.tools.x2j.pojo.Entity;
import com.google.common.collect.Maps;

final class Expander {

	private static final GStringTemplateEngine engine = new GStringTemplateEngine();

	private Template pojoTemplate;

	private Template bodyTemplate;

	private Template headTemplate;

	private static Expander instance;

	private Expander() {
		pojoTemplate = template("templates/pojo.template");
		headTemplate = template("templates/head.template");
		bodyTemplate = template("templates/body.template");
	}

	public static Expander getInstance() {
		if (instance == null) {
			instance = new Expander();
		}
		return instance;
	}

	public static String expand(Entity entity) {
		return Expander.getInstance().doExpand(entity);
	}

	private Reader read(String resource) {
		InputStream stream = Thread.currentThread().getContextClassLoader().getResourceAsStream(resource);
		return new BufferedReader(new InputStreamReader(stream));
	}

	private Template template(String resource) {
		try {
			return engine.createTemplate(read(resource));
		} catch (CompilationFailedException | ClassNotFoundException
				| IOException e) {
			throw new IllegalArgumentException(e);
		}
	}

	private String doExpand(Entity entity) {

		final Map<String, Object> binding = Maps.newHashMap();

		binding.put("pojo", entity);

		final String body = bodyTemplate.make(binding).toString();
		final String imports = headTemplate.make(binding).toString();

		binding.put("namespace", entity.getNamespace());
		binding.put("body", body);
		binding.put("imports", imports);

		return pojoTemplate.make(binding).toString();
	}
}
