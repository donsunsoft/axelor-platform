/**
 * Copyright (c) 2012-2013 Axelor. All Rights Reserved.
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
 * Copyright (c) 2012-2013 Axelor. All Rights Reserved.
 */
package com.axelor.auth;

import java.util.List;
import java.util.Properties;
import java.util.Set;
import java.util.UUID;

import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.naming.NamingEnumeration;
import javax.naming.NamingException;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.BasicAttribute;
import javax.naming.directory.BasicAttributes;
import javax.naming.directory.SearchControls;
import javax.naming.directory.SearchResult;
import javax.naming.ldap.LdapContext;

import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.realm.ldap.JndiLdapContextFactory;
import org.apache.shiro.realm.ldap.LdapUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.axelor.auth.db.Group;
import com.axelor.auth.db.User;
import com.google.common.base.Objects;
import com.google.common.collect.Sets;
import com.google.inject.persist.Transactional;

@Singleton
public class AuthLdap {

	private final Logger log = LoggerFactory.getLogger(getClass());

	public static final String LDAP_SERVER_URL = "ldap.server.url";
	public static final String LDAP_AUTH_TYPE = "ldap.auth.type";

	public static final String LDAP_SYSTEM_USER = "ldap.system.user";
	public static final String LDAP_SYSTEM_PASSWORD = "ldap.system.password";

	public static final String LDAP_GROUP_BASE = "ldap.group.base";
	public static final String LDAP_GROUP_OBJECT_CLASS = "ldap.group.object.class";
	public static final String LDAP_GROUP_FILTER = "ldap.group.filter";

	public static final String LDAP_USER_BASE = "ldap.user.base";
	public static final String LDAP_USER_FILTER = "ldap.user.filter";

	public static final String DEFAULT_AUTH_TYPE = "simple";

	private String ldapServerUrl;

	private String ldapAuthType;

	private String ldapSysUser;

	private String ldapSysPassword;

	private String ldapGroupsDn;

	private String ldapUsersDn;

	private String ldapGroupFilter;

	private String ldapUserFilter;

	private String ldapGroupObjectClass;

	private JndiLdapContextFactory factory = new JndiLdapContextFactory();

	private AuthService authService;

	@Inject
	public AuthLdap(@Named("auth.ldap.config") Properties properties, AuthService authService) {
		ldapServerUrl = properties.getProperty(LDAP_SERVER_URL);
		ldapAuthType = properties.getProperty(LDAP_AUTH_TYPE, DEFAULT_AUTH_TYPE);
		ldapSysUser = properties.getProperty(LDAP_SYSTEM_USER);
		ldapSysPassword = properties.getProperty(LDAP_SYSTEM_PASSWORD);
		ldapGroupsDn = properties.getProperty(LDAP_GROUP_BASE);
		ldapUsersDn = properties.getProperty(LDAP_USER_BASE);
		ldapGroupFilter = properties.getProperty(LDAP_GROUP_FILTER);
		ldapUserFilter = properties.getProperty(LDAP_USER_FILTER);
		ldapGroupObjectClass = properties.getProperty(LDAP_GROUP_OBJECT_CLASS);

		factory.setUrl(ldapServerUrl);
		factory.setSystemUsername(ldapSysUser);
		factory.setSystemPassword(ldapSysPassword);
		factory.setAuthenticationMechanism(ldapAuthType);

		this.authService = authService;
	}

	public boolean isEnabled() {
		return ldapServerUrl != null && !"".equals(ldapServerUrl.trim());
	}

	public boolean ldapUserExists(String filter, String code) {
		try {
			return search(ldapUsersDn, filter, code).hasMore();
		} catch (NamingException e) {
		}
		return false;
	}

	public boolean ldapGroupExists(String filter, String code) {
		try {
			return search(ldapGroupsDn, filter, code).hasMore();
		} catch (NamingException e) {
		}
		return false;
	}

	@Transactional
	public boolean login(String user, String password) throws AuthenticationException {
		if (!this.isEnabled()) {
			throw new IllegalStateException("LDAP is not enabled.");
		}
		try {
			return doLogin(user, password);
		} catch (NamingException e) {
			throw new AuthenticationException(e);
		}
	}

	private boolean doLogin(final String user, final String password) throws NamingException {
		final NamingEnumeration<?> all = search(ldapUsersDn, ldapUserFilter, user);
		if (!all.hasMore()) {
			throw new NamingException("LDAP user does not exist: " + user);
		}
		while (all.hasMore()) {
			final SearchResult result = (SearchResult) all.next();
			final String dn = result.getNameInNamespace();
			LdapContext context = null;
			try {
				context = factory.getLdapContext((Object) dn, password);
			} finally {
				LdapUtils.closeContext(context);
			}
			findOrCreateUser(user, result);
			return true;
		}
		return false;
	}

	private NamingEnumeration<?> search(String where, String filter, String user)
			throws NamingException {

		final SearchControls controls = new SearchControls();
		controls.setSearchScope(SearchControls.SUBTREE_SCOPE);

		String filterString = filter.replaceAll("\\{0\\}", user);

		LdapContext context = factory.getSystemLdapContext();
		try {
			return context.search(where, filterString, controls);
		} finally {
			LdapUtils.closeContext(context);
		}
	}

	private User findOrCreateUser(String code, SearchResult result)
			throws NamingException {

		User user = User.findByCode(code);
		if (user != null) {
			return user;
		}

		Attributes attributes = result.getAttributes();
		Attribute cn = attributes.get("cn");
		String name = code;
		try {
			name = (String) cn.get();
		} catch (NamingException e) {};

		user = new User(code, name);
		user.setPassword(UUID.randomUUID().toString());

		authService.encrypt(user);

		try {
			Group group = findOrCreateGroup(user);
			user.setGroup(group);
		} catch (Exception e) {
		}

		try {
			createLdapGroups();
		} catch (Exception e) {
			log.warn("unable to create ldap groups", e);
		}

		return user.save();
	}

	private Group findOrCreateGroup(User user) throws NamingException {
		Group group = user.getGroup();
		if (group != null) {
			return group;
		}

		final NamingEnumeration<?> all = search(ldapGroupsDn, ldapGroupFilter, user.getCode());
		while (all.hasMore()) {
			SearchResult result = (SearchResult) all.next();
			Attributes attributes = result.getAttributes();
			String name = (String) attributes.get("cn").get();
			group = Group.findByCode(name);
			if (group == null) {
				group = new Group(name, name.substring(0, 1).toUpperCase() + name.substring(1));
			}
			break;
		}

		if (all.hasMore()) {
			log.warn("more then one groups defined.");
		}

		return group;
	}

	private void uploadGroup(Group group) throws NamingException {

		Attributes attrs = new BasicAttributes();

		Attribute objClass = new BasicAttribute("objectClass");
		objClass.add("top");
		objClass.add(ldapGroupObjectClass);

		Attribute cn = new BasicAttribute("cn");
		cn.add(group.getCode());

		Attribute uniqueMember = new BasicAttribute("uniqueMember");
		uniqueMember.add("uid=admin");

		attrs.put(objClass);
		attrs.put(cn);
		attrs.put(uniqueMember);

		LdapContext context =  factory.getSystemLdapContext();
		try {
			context.createSubcontext("cn=" + group.getCode() + "," + ldapGroupsDn, attrs);
		} finally {
			LdapUtils.closeContext(context);
		}
	}

	private void createLdapGroups() throws NamingException {

		if (ldapGroupObjectClass == null || "".equals(ldapGroupObjectClass.trim())) {
			return;
		}

		final Set<String> found = Sets.newHashSet();
		final NamingEnumeration<?> all = search(ldapGroupsDn, ldapGroupFilter, "*");

		while (all.hasMore()) {
			SearchResult result = (SearchResult) all.next();
			Attributes attributes = result.getAttributes();
			String name = (String) attributes.get("cn").get();
			found.add(name);
		}

		final List<Group> groups = Group.all().filter("self.code not in (:names)").bind("names", found).fetch();
		for (Group group : groups) {
			uploadGroup(group);
		}
	}

	@Override
	public String toString() {
		return Objects.toStringHelper(getClass())
				.add("url", ldapServerUrl)
				.toString();
	}
}
