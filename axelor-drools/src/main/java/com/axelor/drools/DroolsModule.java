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
package com.axelor.drools;

import org.drools.KnowledgeBase;
import org.drools.agent.KnowledgeAgent;
import org.drools.agent.KnowledgeAgentConfiguration;
import org.drools.agent.KnowledgeAgentFactory;
import org.drools.io.Resource;
import org.drools.io.ResourceFactory;
import org.drools.runtime.StatefulKnowledgeSession;
import org.drools.runtime.StatelessKnowledgeSession;

import com.google.inject.AbstractModule;
import com.google.inject.name.Names;

/**
 * A module to integrate Drools with Guice.
 * 
 * Here is an example:
 * 
 * <pre>
 * 
 * class MyModule extends AbstractModule {
 * 
 * 	&#064;Override
 * 	protected void configure() {
 * 		install(new DroolsModule( true, 60 ));
 * 	}
 * }
 * 
 * public class MyTest {
 * 
 * 	&#064;Test
 * 	public void testKbaseInjected() {
 * 
 * 		Injector injector = Guice.createInjector(new MyModule());
 * 		KnowledgeBase kbase = injector.getInstance(KnowledgeBase.class);
 * 
 * 		assertNotNull(kbase);
 * 	}
 * }
 * </pre>
 * 
 */
public class DroolsModule extends AbstractModule {

	private String scannerInterval;
	private boolean useScanner;
	
	private KnowledgeAgent knowledgeAgent;
	private Resource resource = ResourceFactory.newUrlResource(Thread.currentThread()
			.getContextClassLoader().getResource("META-INF/drools.xml"));

	public DroolsModule(boolean useScanner, int scannerInterval) {
		
		this.scannerInterval = Integer.toString(scannerInterval);
		this.useScanner = useScanner;
	}

	@Override
	protected void configure() {

		this.prepare();

		bind(KnowledgeAgent.class).annotatedWith(Names.named("knowledgeAgent"))
				.toInstance(knowledgeAgent);

		bind(KnowledgeBase.class).toProvider(KnowledgeBaseProvider.class);
		bind(StatefulKnowledgeSession.class).toProvider(
				StatefulKnowledgeSessionProvider.class);
		bind(StatelessKnowledgeSession.class).toProvider(
				StatelessKnowledgeSessionProvider.class);
	}

	protected void prepare() {

		knowledgeAgent = KnowledgeAgentFactory.newKnowledgeAgent(
				"axelor-drools", getAgentConfiguration());

		knowledgeAgent.applyChangeSet(resource);
		knowledgeAgent.monitorResourceChangeEvents(true);

		if (useScanner){

			ResourceFactory.getResourceChangeNotifierService().start();
			ResourceFactory.getResourceChangeScannerService().start();
			
		}

	}

	private KnowledgeAgentConfiguration getAgentConfiguration() {

		KnowledgeAgentConfiguration knowledgeAgentConfiguration = KnowledgeAgentFactory
				.newKnowledgeAgentConfiguration();
		knowledgeAgentConfiguration.setProperty("drools.agent.newInstance",
				"false");
		knowledgeAgentConfiguration.setProperty(
				"drools.agent.useKBaseClassLoaderForCompiling", "true");
		knowledgeAgentConfiguration.setProperty(
				"drools.resource.scanner.interval", scannerInterval);

		return knowledgeAgentConfiguration;

	}
}
